// Jooble REST API (https://help.jooble.org - "REST API Documentation").
// A key belongs to one country site (India: in.jooble.org) and the free plan
// has a hard lifetime limit of 500 requests, so this source only runs on
// user searches and stops at JOOBLE_MAX_REQUESTS (default 450).

import { countryByCode } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { detectWorkMode, fetchJson, htmlToText, parseSalaryText, toDate } from "../util";

type JoobleJob = {
  id: number | string;
  title: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company?: string;
  updated?: string;
};

// JOOBLE_COUNTRY lists the countries to search ("in" or "in,us"). A key issued
// on the global site (JOOBLE_HOST=jooble.org) filters by location, so one key
// can serve several countries; a country-site key only covers its own country.
const joobleCountries = () =>
  (process.env.JOOBLE_COUNTRY || "in").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
const joobleHost = (cc: string) => process.env.JOOBLE_HOST?.trim() || (cc === "us" ? "jooble.org" : `${cc}.jooble.org`);
const endpoint = (cc: string, key: string) => `https://${joobleHost(cc)}/api/${encodeURIComponent(key)}`;

export function mapJoobleJob(j: JoobleJob, countryCode: string): NormalizedJob {
  const name = countryByCode(countryCode)?.name ?? "";
  const loc = j.location ?? "";
  const salary = j.salary ? parseSalaryText(j.salary) : null;
  return {
    source: "jooble",
    externalId: String(j.id),
    title: htmlToText(j.title),
    company: j.company?.trim() || "Company not listed",
    location: loc && name && !loc.toLowerCase().includes(name.toLowerCase()) ? `${loc}, ${name}` : loc || name,
    workMode: detectWorkMode(j.title, loc, j.snippet),
    employmentType: (j.type ?? "").toLowerCase(),
    salaryMin: salary?.salaryMin ?? null,
    salaryMax: salary?.salaryMax ?? null,
    // Jooble formats pay as "{min} - {max} {currency}"; fall back to the site's currency.
    salaryCurrency: salary?.salaryMin != null ? salary.salaryCurrency ?? (countryCode === "IN" ? "INR" : null) : null,
    salaryPeriod: salary?.salaryMin != null ? salary.salaryPeriod : null,
    description: htmlToText(j.snippet ?? ""),
    url: j.link,
    postedAt: toDate(j.updated),
  };
}

export const jooble: SourceDefinition = {
  id: "jooble",
  name: "Jooble",
  kind: "aggregator",
  homepage: "https://in.jooble.org",
  termsUrl: "https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation",
  attribution: "Jobs via Jooble (official REST API). Descriptions are snippets; see the full posting.",
  cacheTtlMs: 6 * 60 * 60 * 1000,
  requestsPerMinute: 5,
  onDemandOnly: true,
  lifetimeQuota: Number(process.env.JOOBLE_MAX_REQUESTS) || 450,
  get countries() {
    return joobleCountries().map((c) => c.toUpperCase());
  },
  missingConfig: () => (process.env.JOOBLE_API_KEY ? null : "Set JOOBLE_API_KEY (free key from in.jooble.org/api/about) and JOOBLE_COUNTRY."),
  async fetchJobs(query, signal) {
    const cc = query.country?.toLowerCase() ?? joobleCountries()[0];
    if (!joobleCountries().includes(cc)) return []; // not a country this key is set up for
    const name = countryByCode(cc)?.name ?? "";
    const data = await fetchJson<{ totalCount: number; jobs: JoobleJob[] }>(endpoint(cc, process.env.JOOBLE_API_KEY!), signal, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: query.keywords.join(", "), location: query.location || name, page: "1", ResultOnPage: "100", companysearch: "false" }),
    });
    return (data.jobs ?? []).map((j) => mapJoobleJob(j, cc.toUpperCase()));
  },
};
