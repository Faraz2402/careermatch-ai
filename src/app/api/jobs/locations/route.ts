import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { db } from "@/lib/db";
import { COUNTRIES } from "@/lib/geo/data";
import { countryByCode } from "@/lib/geo/detect";
import { activeSources } from "@/lib/jobs/registry";

/**
 * Dropdown data: every country (with live job counts) and, for ?country=XX,
 * its major cities merged with the cities that current listings mention.
 */
export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const code = new URL(req.url).searchParams.get("country")?.toUpperCase() ?? null;
  const live = {
    OR: [
      { source: { in: (await activeSources()).map((s) => s.def.id) }, importedById: null, lastSeenAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      { importedById: user.id },
    ],
  };

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
