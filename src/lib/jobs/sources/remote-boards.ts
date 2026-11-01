// Remote-job boards, each through the public API or RSS feed it publishes for
// other sites (attribution required; every listing links back to the board's
// own page, never with nofollow). Only listings from the last 30 days are kept.
// Locations are written as "Remote - <who can apply>" so the Remote filter can
// tell worldwide roles from ones limited to a country or region.

import { countryByCode } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { fetchJson, htmlToText, rssItems, rssTag, toDate, USER_AGENT } from "../util";
import { boardCountries } from "./ats-boards";

const RECENT_MS = 30 * 86_400_000;
const recent = (j: NormalizedJob) => !j.postedAt || Date.now() - j.postedAt.getTime() <= RECENT_MS;

/** "Remote - Worldwide" when anyone can apply, otherwise "Remote - <where>". */
export function remoteLocation(where: string | string[] | null | undefined) {
  const list = (Array.isArray(where) ? where : (where ?? "").split(/\s*,\s*/)).map((s) => s.trim()).filter(Boolean);
  if (!list.length || list.some((s) => /^(anywhere|worldwide|global|anywhere in the world|remote)$/i.test(s))) return "Remote - Worldwide";
  return `Remote - ${list.join(", ")}`;
}

const job = (j: Omit<NormalizedJob, "workMode" | "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod"> & Partial<NormalizedJob>): NormalizedJob => ({
  workMode: "remote",
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: null,
  salaryPeriod: null,
  ...j,
});

async function fetchText(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal, headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" }, cache: "no-store" });
  if (res.status === 429) throw new Error("Rate limited by provider");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// --- Remote OK (https://remoteok.com/api) ----------------------------------

type RemoteOkJob = { id?: string; slug?: string; date?: string; company?: string; position?: string; tags?: string[]; description?: string; location?: string; url?: string; salary_min?: number; salary_max?: number };

export function mapRemoteOk(j: RemoteOkJob): NormalizedJob | null {
  if (!j.id || !j.position || !j.url) return null; // the first element is the API's legal notice
  return job({
    source: "remoteok",
    externalId: String(j.id),
    title: htmlToText(j.position),
    company: j.company?.trim() || "Company not listed",
    location: remoteLocation(j.location),
    employmentType: "",
    ...(j.salary_min ? { salaryMin: j.salary_min, salaryMax: j.salary_max || null, salaryCurrency: "USD", salaryPeriod: "year" } : {}),
    description: htmlToText(j.description ?? ""),
    url: j.url,
    postedAt: toDate(j.date),
  });
}

export const remoteok: SourceDefinition = {
  id: "remoteok",
  name: "Remote OK",
  kind: "aggregator",
  homepage: "https://remoteok.com",
  termsUrl: "https://remoteok.com/api",
  attribution: "Remote listings from Remote OK (public API; each listing links back to Remote OK).",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const data = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api", signal);
    return data.map(mapRemoteOk).filter((j): j is NormalizedJob => !!j && recent(j));
  },
};

// --- We Work Remotely (RSS) -------------------------------------------------

export function parseWeWorkRemotely(xml: string): NormalizedJob[] {
  return rssItems(xml).map((item) => {
    // Titles read "Company: Job title".
    const raw = htmlToText(rssTag(item, "title"));
    const i = raw.indexOf(": ");
    const url = rssTag(item, "link") || rssTag(item, "guid");
    const region = htmlToText(rssTag(item, "region")).replace(/\s+only$/i, "");
    const country = htmlToText(rssTag(item, "country"));
    return job({
      source: "weworkremotely",
      externalId: url.replace(/^https?:\/\/[^/]+\//, "").slice(0, 180),
      title: i > 0 ? raw.slice(i + 2) : raw,
      company: i > 0 ? raw.slice(0, i) : "Company not listed",
      location: remoteLocation(/anywhere/i.test(region) ? "Worldwide" : country || region),
      employmentType: rssTag(item, "type").toLowerCase(),
      description: htmlToText(rssTag(item, "description")),
      url,
      postedAt: toDate(rssTag(item, "pubDate")),
    });
  });
}

export const weworkremotely: SourceDefinition = {
  id: "weworkremotely",
  name: "We Work Remotely",
  kind: "aggregator",
  homepage: "https://weworkremotely.com",
  termsUrl: "https://weworkremotely.com/remote-jobs.rss",
  attribution: "Remote listings from We Work Remotely (public RSS feed).",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    return parseWeWorkRemotely(await fetchText("https://weworkremotely.com/remote-jobs.rss", signal)).filter(recent);
  },
};

// --- Jobicy (https://jobicy.com/jobs-rss-feed) ------------------------------

type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobType?: string[];
  jobGeo?: string;
  jobDescription?: string;
  pubDate: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export function mapJobicy(j: JobicyJob): NormalizedJob {
  const pay = j.salaryMin ? { salaryMin: j.salaryMin, salaryMax: j.salaryMax ?? null, salaryCurrency: j.salaryCurrency ?? null, salaryPeriod: /hour/i.test(j.salaryPeriod ?? "") ? "hour" : /month/i.test(j.salaryPeriod ?? "") ? "month" : "year" } : {};
  return job({
    source: "jobicy",
    externalId: String(j.id),
    title: htmlToText(j.jobTitle),
    company: htmlToText(j.companyName),
    location: remoteLocation(j.jobGeo),
    employmentType: (j.jobType ?? []).join(", ").toLowerCase(),
    ...pay,
    description: htmlToText(j.jobDescription ?? ""),
    url: j.url,
    postedAt: toDate(j.pubDate),
  });
}

export const jobicy: SourceDefinition = {
  id: "jobicy",
  name: "Jobicy",
  kind: "aggregator",
  homepage: "https://jobicy.com",
  termsUrl: "https://jobicy.com/jobs-rss-feed",
  attribution: "Remote listings from Jobicy (public API; source credited on every listing).",
  // Jobicy asks for no more than one pass per hour.
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const data = await fetchJson<{ jobs?: JobicyJob[] }>("https://jobicy.com/api/v2/remote-jobs?count=100", signal);
    return (data.jobs ?? []).map(mapJobicy).filter(recent);
  },
};

// --- Himalayas (https://himalayas.app/api) ----------------------------------

type HimalayasJob = {
  title: string;
  companyName: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  salaryPeriod?: string | null;
  locationRestrictions?: string[];
  description?: string;
  pubDate: number;
  expiryDate?: number;
  applicationLink: string;
  guid: string;
};

/** Newest feed pages, plus a country search for each EMPLOYER_BOARD_COUNTRIES entry. */
const HIMALAYAS_FEED_PAGES = 8;
const HIMALAYAS_COUNTRY_PAGES = 4;

export function mapHimalayas(j: HimalayasJob): NormalizedJob | null {
  if (j.expiryDate && j.expiryDate * 1000 < Date.now()) return null; // Himalayas asks that expired jobs be removed
  return job({
    source: "himalayas",
    externalId: j.guid.replace(/^https?:\/\/[^/]+\//, "").slice(0, 180),
    title: htmlToText(j.title),
    company: htmlToText(j.companyName),
    location: remoteLocation(j.locationRestrictions),
    employmentType: (j.employmentType ?? "").toLowerCase(),
    ...(j.minSalary ? { salaryMin: j.minSalary, salaryMax: j.maxSalary ?? null, salaryCurrency: j.currency ?? "USD", salaryPeriod: /hour/i.test(j.salaryPeriod ?? "") ? "hour" : /month/i.test(j.salaryPeriod ?? "") ? "month" : "year" } : {}),
    description: htmlToText(j.description ?? ""),
    // Himalayas requires its applicationLink, unchanged, for the Apply button.
    url: j.applicationLink,
    postedAt: toDate(j.pubDate),
  });
}

export const himalayas: SourceDefinition = {
  id: "himalayas",
  name: "Himalayas",
  kind: "aggregator",
  homepage: "https://himalayas.app",
  termsUrl: "https://himalayas.app/api",
  attribution: "Remote listings from Himalayas (public API; apply through the Himalayas link).",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 20,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const out: HimalayasJob[] = [];
    let cursor = "";
    for (let page = 0; page < HIMALAYAS_FEED_PAGES; page++) {
      const data = await fetchJson<{ jobs: HimalayasJob[]; nextCursor?: string | null }>(`https://himalayas.app/jobs/api?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, signal);
      out.push(...data.jobs);
      if (!data.nextCursor || !data.jobs.length) break;
      cursor = data.nextCursor;
    }
    for (const cc of boardCountries()) {
      const name = countryByCode(cc)?.name;
      if (!name) continue;
      for (let page = 1; page <= HIMALAYAS_COUNTRY_PAGES; page++) {
        const data = await fetchJson<{ jobs: HimalayasJob[] }>(`https://himalayas.app/jobs/api/search?country=${encodeURIComponent(name)}&page=${page}`, signal);
        out.push(...data.jobs);
        if (data.jobs.length < 20) break;
      }
    }
    const seen = new Set<string>();
    return out
      .map(mapHimalayas)
      .filter((j): j is NormalizedJob => !!j && recent(j) && !seen.has(j.externalId) && !!seen.add(j.externalId));
  },
};

// --- Working Nomads ---------------------------------------------------------

type WorkingNomadsJob = { url: string; title: string; description?: string; company_name?: string; location?: string; pub_date: string };

export function mapWorkingNomads(j: WorkingNomadsJob): NormalizedJob {
  // Time-zone notes ("CET (+/- 3 hours)") aren't places; leave those as plain "Remote".
  const where = /time ?zone|[+-]\s*\d+\s*hours?|\b(utc|gmt|cet|est|pst)\b/i.test(j.location ?? "") ? "" : j.location;
  return job({
    source: "workingnomads",
    externalId: (j.url.match(/(\d+)\/?$/)?.[1] ?? j.url).slice(0, 180),
    title: htmlToText(j.title),
    company: j.company_name?.trim() || "Company not listed",
    location: where ? remoteLocation(where) : "Remote",
    employmentType: "",
    description: htmlToText(j.description ?? ""),
    url: j.url,
    postedAt: toDate(j.pub_date),
  });
}

export const workingnomads: SourceDefinition = {
  id: "workingnomads",
  name: "Working Nomads",
  kind: "aggregator",
  homepage: "https://www.workingnomads.com",
  termsUrl: "https://www.workingnomads.com/api/exposed_jobs/",
  attribution: "Remote listings from Working Nomads (public jobs feed).",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const data = await fetchJson<WorkingNomadsJob[]>("https://www.workingnomads.com/api/exposed_jobs/", signal);
    return data.map(mapWorkingNomads).filter(recent);
  },
};

// --- Real Work From Anywhere (RSS; worldwide roles only) --------------------

export function parseRealWorkFromAnywhere(xml: string): NormalizedJob[] {
  return rssItems(xml).map((item) => {
    // Titles read "Job title at Company".
    const raw = htmlToText(rssTag(item, "title"));
    const at = raw.lastIndexOf(" at ");
    const url = rssTag(item, "link") || rssTag(item, "guid");
    return job({
      source: "realworkfromanywhere",
      externalId: url.replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "").slice(0, 180),
      title: at > 0 ? raw.slice(0, at) : raw,
      company: at > 0 ? raw.slice(at + 4) : "Company not listed",
      location: "Remote - Worldwide",
      employmentType: "",
      description: htmlToText(rssTag(item, "description")),
      url,
      postedAt: toDate(rssTag(item, "pubDate")),
    });
  });
}

export const realworkfromanywhere: SourceDefinition = {
  id: "realworkfromanywhere",
  name: "Real Work From Anywhere",
  kind: "aggregator",
  homepage: "https://www.realworkfromanywhere.com",
  termsUrl: "https://www.realworkfromanywhere.com/rss.xml",
  attribution: "Work-from-anywhere listings from Real Work From Anywhere (public RSS feed).",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    return parseRealWorkFromAnywhere(await fetchText("https://www.realworkfromanywhere.com/rss.xml", signal)).filter(recent);
  },
};

// --- Findwork (https://findwork.dev/developers/; free API key) --------------

type FindworkJob = { id: string; role: string; company_name?: string; employment_type?: string | null; location?: string | null; url: string; text?: string; date_posted: string };

/** Pages of 100 per run (the key allows 10 requests a minute); stops at the 30-day window. */
const FINDWORK_PAGES = 8;

export function mapFindwork(j: FindworkJob): NormalizedJob {
  return job({
    source: "findwork",
    externalId: j.id,
    title: htmlToText(j.role),
    company: j.company_name?.trim() || "Company not listed",
    // Findwork gives no "who can apply" for most remote roles; those stay plain "Remote".
    location: j.location ? remoteLocation(j.location) : "Remote",
    employmentType: (j.employment_type ?? "").toLowerCase(),
    description: htmlToText(j.text ?? ""),
    url: j.url,
    postedAt: toDate(j.date_posted),
  });
}

export const findwork: SourceDefinition = {
  id: "findwork",
  name: "Findwork",
  kind: "aggregator",
  homepage: "https://findwork.dev",
  termsUrl: "https://findwork.dev/developers/",
  attribution: "Remote listings from Findwork (API; each listing links back to Findwork).",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => (process.env.FINDWORK_API_KEY?.trim() ? null : "Set FINDWORK_API_KEY (free at findwork.dev/developers)."),
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const out: NormalizedJob[] = [];
    for (let page = 1; page <= FINDWORK_PAGES; page++) {
      const data = await fetchJson<{ results: FindworkJob[]; next: string | null }>(`https://findwork.dev/api/jobs/?remote=true&sort_by=date&page=${page}`, signal, {
        headers: { Authorization: `Token ${process.env.FINDWORK_API_KEY!.trim()}` },
      });
      const jobs = data.results.map(mapFindwork);
      out.push(...jobs.filter(recent));
      if (!data.next || jobs.some((j) => !recent(j))) break; // newest first: past the window, stop
    }
    return out;
  },
};

export const REMOTE_BOARDS = [remoteok, weworkremotely, jobicy, himalayas, workingnomads, realworkfromanywhere, findwork];
