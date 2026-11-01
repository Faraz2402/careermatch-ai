import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { db } from "@/lib/db";
import { COUNTRIES } from "@/lib/geo/data";
import { countryByCode, remoteCounts, storedGeo } from "@/lib/geo/detect";
import { activeSources } from "@/lib/jobs/registry";
import { MAX_LISTING_AGE_DAYS } from "@/lib/jobs/ingest";
import { REMOTE_ANYWHERE } from "@/lib/jobs/service";

/**
 * Dropdown data: every country (with live job counts) and, for ?country=XX,
 * its major cities merged with the cities that current listings mention.
 * With ?country=REMOTE: remote-role counts, worldwide and per country they're open to.
 */
export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const code = new URL(req.url).searchParams.get("country")?.toUpperCase() ?? null;
  if (code === REMOTE_ANYWHERE) return remoteOptions(user.id);
  const live = await liveWhere(user.id);

  const [byCountry, remote, byCity] = await Promise.all([
    db.job.groupBy({ by: ["country"], where: { ...live, country: { not: null } }, _count: true }),
    db.job.count({ where: { ...live, workMode: "remote" } }),
    code ? db.job.groupBy({ by: ["city"], where: { ...live, country: code, city: { not: null } }, _count: true }) : Promise.resolve([]),
  ]);
  const counts = new Map(byCountry.map((c) => [c.country!, c._count]));
  const countries = COUNTRIES.map((c) => ({ code: c.code, name: c.name, region: c.region, jobs: counts.get(c.code) ?? 0 }));

  let cities: { name: string; jobs: number; major: boolean }[] = [];
  const country = countryByCode(code);
  if (country) {
    const cityCounts = new Map(byCity.map((c) => [c.city!, c._count]));
    const names = [...new Set([...country.cities, ...cityCounts.keys()])];
    cities = names
      .map((name) => ({ name, jobs: cityCounts.get(name) ?? 0, major: country.cities.includes(name) }))
      // Cities with listings first (most jobs on top), then the rest in market-size order.
      .sort((a, b) => b.jobs - a.jobs || country.cities.indexOf(a.name) - country.cities.indexOf(b.name));
  }

  return NextResponse.json({ countries, remote, cities }, { headers: { "Cache-Control": "private, max-age=60" } });
}

/** Listings the default search can show: live, and posted within the last 30 days. */
async function liveWhere(userId: string) {
  return {
    AND: [
      {
        OR: [
          { source: { in: (await activeSources()).map((s) => s.def.id) }, importedById: null, lastSeenAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
          { importedById: userId },
        ],
      },
      { OR: [{ postedAt: { gte: new Date(Date.now() - MAX_LISTING_AGE_DAYS * 86_400_000) } }, { postedAt: null }] },
    ],
  };
}

async function remoteOptions(userId: string) {
  const all = await db.job.findMany({
    where: { ...(await liveWhere(userId)), workMode: "remote" },
    select: { title: true, company: true, countries: true, remoteScope: true, location: true, workMode: true },
  });
  // Count each role once, as the search does when a job is cross-posted on several boards.
  const seen = new Set<string>();
  const rows = all.filter((r) => {
    const k = `${r.title}|${r.company}`.toLowerCase();
    return !seen.has(k) && !!seen.add(k);
  });
  const { worldwide, countries } = remoteCounts(rows.map(storedGeo), COUNTRIES);
  const remoteCountries = countries
    .filter((c) => c.jobs > 0)
    .map((c) => ({ code: c.code, name: countryByCode(c.code)!.name, jobs: c.jobs }))
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name));
  return NextResponse.json({ total: rows.length, worldwide, countries: remoteCountries }, { headers: { "Cache-Control": "private, max-age=60" } });
}
