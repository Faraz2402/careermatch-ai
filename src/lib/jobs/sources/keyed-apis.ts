// Official search APIs that require a (free) developer key.

import { countryByCode } from "../../geo/detect";
import type { SourceDefinition } from "../types";
import { detectWorkMode, fetchJson, htmlToText, toDate } from "../util";

type AdzunaResult = {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_time?: string;
  contract_type?: string;
};

// Countries Adzuna's API covers, and the currency their salaries are in.
const ADZUNA_CURRENCY: Record<string, string> = {
  in: "INR", us: "USD", gb: "GBP", ca: "CAD", au: "AUD", nz: "NZD", sg: "SGD", za: "ZAR", br: "BRL", mx: "MXN",
  de: "EUR", fr: "EUR", nl: "EUR", at: "EUR", be: "EUR", es: "EUR", it: "EUR", ch: "CHF", pl: "PLN",
};

function withCountry(location: string, code: string) {
  const name = countryByCode(code)?.name;
  if (!name || location.toLowerCase().includes(name.toLowerCase())) return location;
  return location ? `${location}, ${name}` : name;
}

export const adzuna: SourceDefinition = {
  id: "adzuna",
  name: "Adzuna",
  kind: "official_api",
  homepage: "https://www.adzuna.com",
  termsUrl: "https://developer.adzuna.com/docs/terms_of_service",
  attribution: "Jobs by Adzuna (official API). Descriptions are snippets; see full posting.",
  cacheTtlMs: 30 * 60 * 1000,
  requestsPerMinute: 20,
  countries: Object.keys(ADZUNA_CURRENCY).map((c) => c.toUpperCase()),
  countriesEnv: "ADZUNA_COUNTRIES",
  missingConfig: () =>
    process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? null : "Set ADZUNA_APP_ID and ADZUNA_APP_KEY (free at developer.adzuna.com).",
  async fetchJobs(query, signal) {
    const country = (query.country ?? (process.env.ADZUNA_COUNTRIES || process.env.ADZUNA_COUNTRY || "in").split(",")[0]).trim().toLowerCase();
    if (!ADZUNA_CURRENCY[country]) return [];
    // Newest first, never older than the requested window (default 30 days):
    // relevance order mostly returns months-old postings.
    const params = new URLSearchParams({
      app_id: process.env.ADZUNA_APP_ID!,
      app_key: process.env.ADZUNA_APP_KEY!,
      results_per_page: "50",
      what: query.keywords.join(" "),
      sort_by: "date",
      max_days_old: String(Math.min(query.maxDaysOld ?? 30, 30)),
      "content-type": "application/json",
    });
    if (query.location) params.set("where", query.location);
    // Title searches match the job title only; description matches are mostly
    // unrelated roles that merely mention the word.
    if (query.titleOnly) {
      params.delete("what");
      params.set("title_only", query.keywords.join(" "));
    }
    const results: AdzunaResult[] = [];
    for (let page = 1; page <= 2; page++) {
      const data = await fetchJson<{ results: AdzunaResult[] }>(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${params}`, signal);
      results.push(...data.results);
      if (data.results.length < 50) break; // no further pages
    }
    return results.map((j) => {
      // Adzuna marks some salaries as model estimates - we only show real ones.
      const real = j.salary_is_predicted !== "1";
      return {
        source: "adzuna",
        externalId: j.id,
        title: htmlToText(j.title),
        company: j.company?.display_name ?? "Unknown company",
        // Adzuna omits the country ("Pune, Maharashtra"); add it so detection is exact.
        location: withCountry(j.location?.display_name ?? "", country),
        workMode: detectWorkMode(j.title, j.description, j.location?.display_name),
        employmentType: [j.contract_time, j.contract_type].filter(Boolean).join(", ").replace(/_/g, "-"),
        salaryMin: real && j.salary_min ? Math.round(j.salary_min) : null,
        salaryMax: real && j.salary_max ? Math.round(j.salary_max) : null,
        salaryCurrency: real && j.salary_min ? ADZUNA_CURRENCY[country] ?? null : null,
        salaryPeriod: real && j.salary_min ? "year" : null,
        description: htmlToText(j.description),
        url: j.redirect_url,
        postedAt: toDate(j.created),
      };
    });
  },
};
