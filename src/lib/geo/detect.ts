import { CITY_ALIASES, COUNTRIES, REGION_WORDS, type Country, type Region } from "./data";

export type DetectedLocation = {
  /** ISO codes of countries named or implied, in order of appearance. */
  countries: string[];
  /** Canonical city name (within the first country), if any. */
  city: string | null;
  remote: boolean;
  /** For remote roles: which regions may apply ("any" = worldwide). */
  regions: Region[] | "any" | null;
};

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export const countryByCode = (code: string | null | undefined) => (code ? BY_CODE.get(code.toUpperCase()) ?? null : null);
export const countryByName = (name: string) => COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null;

// When a city name exists in several countries, prefer the bigger job market.
const PRIORITY = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "NL", "IE", "SG", "AE", "ES", "IT", "SE", "CH", "PL", "BR", "MX", "JP", "CN"];
const rank = (c: Country) => {
  const i = PRIORITY.indexOf(c.code);
  return i === -1 ? PRIORITY.length : i;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (s: string, flags = "i") => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(s)}(?=$|[^\\p{L}\\p{N}])`, flags + "u");

// Very short aliases ("US", "UK", "UAE") only count when written in capitals,
// so "join us" or "uk-based" prose doesn't get misread.
type Matcher = { re: RegExp; country: Country };
const COUNTRY_MATCHERS: Matcher[] = COUNTRIES.flatMap((c) =>
  [c.name, ...(c.aliases ?? [])]
    .filter((n) => n.toLowerCase() !== "georgia") // ambiguous with the US state
    .map((n) => ({ re: n.replace(/\./g, "").length <= 3 ? wordRe(n.toUpperCase(), "") : wordRe(n), country: c })),
);
const GEORGIA = COUNTRIES.find((c) => c.code === "GE")!;

type CityEntry = { city: string; re: RegExp; country: Country };
const CITY_INDEX: CityEntry[] = COUNTRIES.flatMap((c) =>
  c.cities.flatMap((city) => [city, ...(CITY_ALIASES[city] ?? [])].map((name) => ({ city, re: wordRe(name), country: c }))),
)
  // Longest names first so "New Delhi" wins over "Delhi", "Navi Mumbai" over "Mumbai".
  .sort((a, b) => b.re.source.length - a.re.source.length || rank(a.country) - rank(b.country));

const STATE_INDEX = COUNTRIES.flatMap((c) =>
  (c.states ?? []).map((s) => ({ re: s.length <= 3 ? new RegExp(`(,|\\s)\\s*${s}(?=$|[\\s,)/-])`) : wordRe(s), country: c, long: s.length > 3 })),
);

const REGION_MATCHERS = Object.entries(REGION_WORDS).map(([word, regions]) => ({
  re: word.length <= 3 ? wordRe(word.toUpperCase(), "") : wordRe(word),
  regions,
}));

const REMOTE_RE = /\bremote\b|work from home|\bwfh\b|anywhere|worldwide|distributed|telecommute/i;

const cache = new Map<string, DetectedLocation>();

export function detectLocation(text: string | null | undefined): DetectedLocation {
  const t = (text ?? "").trim();
  const hit = cache.get(t);
  if (hit) return hit;

  const found: { country: Country; at: number }[] = [];
  const add = (country: Country, at: number) => {
    if (!found.some((f) => f.country === country)) found.push({ country, at });
  };

  for (const m of COUNTRY_MATCHERS) {
    const r = m.re.exec(t);
    if (r) add(m.country, r.index);
  }
  let city: CityEntry | null = null;
  for (const e of CITY_INDEX) {
    const r = e.re.exec(t);
    // The index is sorted longest-name first, so the first hit is the best one.
    if (r) {
      // Prefer a city that belongs to an explicitly named country.
      if (found.length && !found.some((f) => f.country === e.country) && found.some((f) => f.country.cities.some((c) => e.re.test(c)))) continue;
      city = e;
      if (!found.length) add(e.country, r.index);
      break;
    }
  }
  if (!found.length) {
    for (const s of STATE_INDEX) {
      const r = s.re.exec(t);
      if (r) {
        add(s.country, r.index);
        break;
      }
    }
  }
  if (!found.length && wordRe("georgia").test(t)) add(GEORGIA, 0);
  found.sort((a, b) => a.at - b.at);

  const first = found[0]?.country ?? null;
  // Keep the city only if it belongs to the primary country.
  const cityName = city && first && city.country === first ? city.city : first ? first.cities.find((c) => wordRe(c).test(t)) ?? null : null;

  let regions: Region[] | "any" | null = null;
  for (const m of REGION_MATCHERS) {
    if (!m.re.test(t)) continue;
    if (m.regions === "any") {
      regions = "any";
      break;
    }
    regions = [...new Set([...((regions as Region[] | null) ?? []), ...m.regions])];
  }

  const result: DetectedLocation = {
    countries: found.map((f) => f.country.code),
    city: cityName,
    remote: REMOTE_RE.test(t),
    regions,
  };
  if (cache.size > 50_000) cache.clear();
  cache.set(t, result);
  return result;
}

/**
 * Can someone in `countryCode` take this job? True when the job is located
 * there, or it's remote and open to that country/its region/worldwide.
 * Remote roles that name other countries only (e.g. "UK – Remote") are not.
 */
export function jobAvailableIn(job: { countries: string[]; remote: boolean; regions: Region[] | "any" | null }, countryCode: string, includeRemote: boolean) {
  if (job.countries.includes(countryCode)) return true;
  if (!includeRemote || !job.remote || job.countries.length > 0) return false;
  const country = countryByCode(countryCode);
  if (!country) return false;
  return job.regions === "any" || (Array.isArray(job.regions) && job.regions.includes(country.region));
}

/** With the Remote filter, the second dropdown's value for roles open to anyone, anywhere. */
export const REMOTE_WORLDWIDE = "WORLDWIDE";

/** Is this remote role open worldwide (no country or region limits)? */
export function remoteWorldwide(job: { countries: string[]; regions: Region[] | "any" | null }) {
  return job.countries.length === 0 && job.regions === "any";
}

/**
 * Remote-job counts for the Remote dropdown: worldwide roles, and per country
 * the roles someone there can take (same rule as jobAvailableIn).
 */
export function remoteCounts(jobs: { countries: string[]; regions: Region[] | "any" | null }[], countryList: { code: string; region: Region }[]) {
  const direct = new Map<string, number>();
  const byRegion = new Map<Region, number>();
  let worldwide = 0;
  for (const j of jobs) {
    if (j.countries.length) for (const c of new Set(j.countries)) direct.set(c, (direct.get(c) ?? 0) + 1);
    else if (j.regions === "any") worldwide++;
    else if (Array.isArray(j.regions)) for (const r of new Set(j.regions)) byRegion.set(r, (byRegion.get(r) ?? 0) + 1);
  }
  return {
    worldwide,
    countries: countryList.map((c) => ({ code: c.code, jobs: (direct.get(c.code) ?? 0) + worldwide + (byRegion.get(c.region) ?? 0) })),
  };
}

export function cityMatches(jobCity: string | null, jobLocation: string, wanted: string) {
  if (jobCity && jobCity.toLowerCase() === wanted.toLowerCase()) return true;
  return [wanted, ...(CITY_ALIASES[wanted] ?? [])].some((n) => wordRe(n).test(jobLocation));
}

/** Columns stored on Job for fast country/city filtering and facets. */
export function geoFields(location: string) {
  const g = detectLocation(location);
  return {
    country: g.countries[0] ?? null,
    countries: g.countries.join(","),
    city: g.city,
    remoteScope: g.regions === "any" ? "any" : g.regions?.join(",") ?? null,
  };
}

/** Rebuild a DetectedLocation-like object from stored Job columns. */
export function storedGeo(j: { countries: string; remoteScope: string | null; location: string; workMode: string }) {
  return {
    countries: j.countries ? j.countries.split(",") : [],
    remote: j.workMode === "remote" || REMOTE_RE.test(j.location),
    regions: j.remoteScope === "any" ? ("any" as const) : j.remoteScope ? (j.remoteScope.split(",") as Region[]) : null,
  };
}
