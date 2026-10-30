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
    const params = new URLSearchParams({
      app_id: process.env.ADZUNA_APP_ID!,
      app_key: process.env.ADZUNA_APP_KEY!,
      results_per_page: "50",
      what: query.keywords.join(" "),
      "content-type": "application/json",
    });
    if (query.location) params.set("where", query.location);
    const data = await fetchJson<{ results: AdzunaResult[] }>(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
      signal,
    );
    return data.results.map((j) => {
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

type UsaJobsItem = {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName: string;
    PositionLocationDisplay: string;
    PositionURI: string;
    PublicationStartDate: string;
    PositionSchedule?: { Name: string }[];
    PositionRemuneration?: { MinimumRange: string; MaximumRange: string; RateIntervalCode: string }[];
    QualificationSummary?: string;
    UserArea?: { Details?: { JobSummary?: string; MajorDuties?: string[]; TeleworkEligible?: boolean; RemoteIndicator?: boolean } };
  };
};

export const usajobs: SourceDefinition = {
  id: "usajobs",
  name: "USAJOBS",
  kind: "official_api",
  homepage: "https://www.usajobs.gov",
  termsUrl: "https://developer.usajobs.gov/",
  attribution: "U.S. federal government listings from the official USAJOBS API.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 20,
  missingConfig: () =>
    process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT ? null : "Set USAJOBS_API_KEY and USAJOBS_USER_AGENT.",
  async fetchJobs(query, signal) {
    const params = new URLSearchParams({ ResultsPerPage: "50", Keyword: query.keywords.join(" ") });
    if (query.location) params.set("LocationName", query.location);
    const data = await fetchJson<{ SearchResult: { SearchResultItems: UsaJobsItem[] } }>(
      `https://data.usajobs.gov/api/search?${params}`,
      signal,
      { headers: { Host: "data.usajobs.gov", "User-Agent": process.env.USAJOBS_USER_AGENT!, "Authorization-Key": process.env.USAJOBS_API_KEY! } },
    );
    return data.SearchResult.SearchResultItems.map(({ MatchedObjectId, MatchedObjectDescriptor: d }) => {
      const pay = d.PositionRemuneration?.[0];
      const details = d.UserArea?.Details;
      return {
        source: "usajobs",
        externalId: MatchedObjectId,
        title: d.PositionTitle,
        company: d.OrganizationName,
        location: d.PositionLocationDisplay,
        workMode: details?.RemoteIndicator ? "remote" as const : details?.TeleworkEligible ? "hybrid" as const : "onsite" as const,
        employmentType: d.PositionSchedule?.map((s) => s.Name).join(", ") ?? "",
        salaryMin: pay ? Math.round(Number(pay.MinimumRange)) : null,
        salaryMax: pay ? Math.round(Number(pay.MaximumRange)) : null,
        salaryCurrency: pay ? "USD" : null,
        salaryPeriod: pay ? (pay.RateIntervalCode === "PH" ? "hour" : "year") : null,
        description: [details?.JobSummary, ...(details?.MajorDuties ?? []), d.QualificationSummary].filter(Boolean).join("\n\n"),
        url: d.PositionURI,
        postedAt: toDate(d.PublicationStartDate),
      };
    });
  },
};
