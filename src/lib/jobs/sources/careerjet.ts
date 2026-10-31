// Careerjet job search API v4 (https://www.careerjet.com/partners/api).
// Free publisher key. Every request must carry the IP and user agent of the
// person whose search triggered it, so this source runs only on user searches.

import { createHash } from "node:crypto";
import { countryByCode } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { detectWorkMode, fetchJson, htmlToText } from "../util";

// ISO country -> Careerjet locale (each locale is a Careerjet country site).
const LOCALES: Record<string, string> = {
  IN: "en_IN", US: "en_US", GB: "en_GB", CA: "en_CA", AU: "en_AU", NZ: "en_NZ", IE: "en_IE", SG: "en_SG",
  ZA: "en_ZA", AE: "en_AE", PH: "en_PH", MY: "en_MY", PK: "en_PK", NG: "en_NG",
  DE: "de_DE", FR: "fr_FR", ES: "es_ES", IT: "it_IT", NL: "nl_NL", PL: "pl_PL", BR: "pt_BR", MX: "es_MX",
};

type CareerjetJob = {
  title: string;
  company?: string;
  date?: string;
  description?: string;
  locations?: string;
  salary?: string;
  salary_currency_code?: string;
  salary_min?: number;
  salary_max?: number;
  salary_type?: "Y" | "M" | "W" | "D" | "H";
  url: string;
};

type CareerjetResponse = { type: "JOBS"; hits: number; jobs: CareerjetJob[] } | { type: "LOCATIONS"; message: string; locations: string[] };

// Weekly/daily pay is converted to yearly; monthly and hourly are kept as-is.
const PERIOD: Record<string, { period: string; factor: number }> = {
  Y: { period: "year", factor: 1 },
  M: { period: "month", factor: 1 },
  H: { period: "hour", factor: 1 },
  W: { period: "year", factor: 52 },
  D: { period: "year", factor: 260 },
};

export function mapCareerjetJob(j: CareerjetJob, countryCode: string): NormalizedJob {
  const p = j.salary_type ? PERIOD[j.salary_type] : undefined;
  const hasPay = p && (j.salary_min || j.salary_max);
  const name = countryByCode(countryCode)?.name ?? "";
  const loc = j.locations ?? "";
  return {
    source: "careerjet",
    externalId: createHash("sha1").update(j.url).digest("hex").slice(0, 20),
    title: htmlToText(j.title),
    company: j.company?.trim() || "Company not listed",
    // Careerjet sites are per country and often omit it ("Pune").
    location: loc && name && !loc.toLowerCase().includes(name.toLowerCase()) ? `${loc}, ${name}` : loc || name,
    workMode: detectWorkMode(j.title, loc, j.description),
    employmentType: "",
    salaryMin: hasPay && j.salary_min ? Math.round(j.salary_min * p.factor) : null,
    salaryMax: hasPay && j.salary_max ? Math.round(j.salary_max * p.factor) : null,
    salaryCurrency: hasPay ? j.salary_currency_code ?? null : null,
    salaryPeriod: hasPay ? p.period : null,
    description: htmlToText(j.description ?? ""),
    url: j.url,
    // Dates look like "Wed,15 Nov 2025 19:13:43 GMT".
    postedAt: j.date ? (d => (Number.isNaN(d.getTime()) ? null : d))(new Date(j.date.replace(/,(\S)/, ", $1"))) : null,
  };
}

export const careerjet: SourceDefinition = {
  id: "careerjet",
  name: "Careerjet",
  kind: "aggregator",
  homepage: "https://www.careerjet.co.in",
  termsUrl: "https://www.careerjet.com/partners/api",
  attribution: "Jobs by Careerjet (official partner API). Descriptions are excerpts; see the full posting.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 20,
  onDemandOnly: true,
  countries: Object.keys(LOCALES),
  missingConfig: () => (process.env.CAREERJET_API_KEY ? null : "Set CAREERJET_API_KEY (free publisher key at careerjet.com/partners)."),
  async fetchJobs(query, signal) {
    const country = (query.country ?? "IN").toUpperCase();
    const locale = LOCALES[country];
    if (!locale || !query.client) return []; // the API requires the end user's IP and agent
    const params = new URLSearchParams({
      locale_code: locale,
      keywords: query.keywords.join(" "),
      page_size: "100",
      fragment_size: "600",
      sort: "relevance",
      // Local development has no forwarded client IP.
      user_ip: /^(local|::1|::ffff:127\.0\.0\.1)$/.test(query.client.ip) ? "127.0.0.1" : query.client.ip,
      user_agent: query.client.userAgent,
    });
    if (query.location) params.set("location", query.location);
    const data = await fetchJson<CareerjetResponse>(`https://search.api.careerjet.net/v4/query?${params}`, signal, {
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.CAREERJET_API_KEY}:`).toString("base64")}` },
    });
    // "LOCATIONS" means the location was unknown/ambiguous - no search happened.
    return data.type === "JOBS" ? data.jobs.map((j) => mapCareerjetJob(j, country)) : [];
  },
};
