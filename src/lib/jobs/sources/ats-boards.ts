// More employer career sites, each through the public feed its hiring
// platform publishes for job seekers and job boards: SmartRecruiters (Posting
// API), Workable (careers-page widget API), SAP SuccessFactors (career-site
// RSS) and Oracle Recruiting Cloud, the successor to Taleo (candidate
// experience REST API). Which employers to include is configured in Admin →
// Sources. Listings are limited to EMPLOYER_BOARD_COUNTRIES (default India),
// and SuccessFactors / Oracle hosts are only read where robots.txt allows it.

import { countryByCode } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { USER_AGENT, csvEnv, decodeEntities, detectWorkMode, fetchJson, htmlToText, robotsTxtAllows, toDate } from "../util";
import { forEachBoard, titleCase } from "./employer-boards";

/** ISO codes (upper case) to collect from employer platforms. */
export const boardCountries = () => {
  const list = csvEnv("EMPLOYER_BOARD_COUNTRIES").map((c) => c.toUpperCase());
  return list.length ? list : ["IN"];
};

const countryName = (code: string) => countryByCode(code)?.name ?? code;

/** "host/SITE=Company" -> parts; the "=Company" label is optional. */
export function parseBoard(board: string) {
  const [target, label] = board.split("=").map((s) => s.trim());
  const [host, site = ""] = target.split("/");
  return { host: host.toLowerCase(), site, label: label || "" };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

const robotsCache = new Map<string, { at: number; text: string | null }>();

/** robots.txt check for a configured employer host (cached for an hour). */
async function allowedByRobots(url: URL, signal: AbortSignal) {
  let entry = robotsCache.get(url.origin);
  if (!entry || Date.now() - entry.at > 3_600_000) {
    let text: string | null = null;
    try {
      const res = await fetch(new URL("/robots.txt", url.origin), { signal, headers: { "User-Agent": USER_AGENT }, cache: "no-store" });
      text = res.ok ? await res.text() : null;
    } catch {
      text = null; // unreachable robots.txt: treat as no rules
    }
    entry = { at: Date.now(), text };
    robotsCache.set(url.origin, entry);
  }
  return entry.text === null || robotsTxtAllows(entry.text, url.pathname + url.search);
}

async function assertRobots(url: URL, signal: AbortSignal) {
  if (!(await allowedByRobots(url, signal))) throw new Error(`robots.txt disallows ${url.host}${url.pathname}`);
}

// --- SmartRecruiters --------------------------------------------------------

type SrPosting = {
  id: string;
  name: string;
  releasedDate: string;
  company: { identifier: string; name: string };
  location: { city?: string; region?: string; country?: string; remote?: boolean; hybrid?: boolean; fullLocation?: string };
  function?: { label?: string };
  experienceLevel?: { label?: string };
  typeOfEmployment?: { label?: string };
};

type SrDetail = SrPosting & {
  postingUrl?: string;
  applyUrl?: string;
  jobAd?: { sections?: Record<string, { title?: string; text?: string }> };
};

/** Full job ads fetched per company per run; older postings keep their saved text. */
const SR_DETAILS_PER_COMPANY = 30;

export function mapSmartRecruiters(p: SrPosting, detail?: SrDetail | null): NormalizedJob {
  const loc = p.location ?? {};
  const where = (loc.fullLocation || [loc.city, loc.region, loc.country ? countryName(loc.country.toUpperCase()) : ""].join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
  const sections = detail?.jobAd?.sections ?? {};
  const full = ["jobDescription", "qualifications", "additionalInformation"]
    .map((k) => sections[k])
    .filter((s) => s?.text)
    .map((s) => `${s!.title ?? ""}\n${htmlToText(s!.text!)}`.trim())
    .join("\n\n");
  const summary = [p.function?.label, p.experienceLevel?.label, p.typeOfEmployment?.label].filter(Boolean).join(" · ");
  return {
    source: "smartrecruiters",
    externalId: `${p.company.identifier}-${p.id}`,
    title: p.name.trim(),
    company: p.company.name || titleCase(p.company.identifier),
    location: where,
    workMode: loc.remote ? "remote" : loc.hybrid ? "hybrid" : "onsite",
    employmentType: (p.typeOfEmployment?.label ?? "").toLowerCase(),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    description: full || summary,
    url: detail?.postingUrl ?? `https://jobs.smartrecruiters.com/${encodeURIComponent(p.company.identifier)}/${p.id}`,
    postedAt: toDate(p.releasedDate),
    ...(full ? {} : { summaryOnly: true }),
  };
}

export const smartrecruiters: SourceDefinition = {
  id: "smartrecruiters",
  boardsEnv: "SMARTRECRUITERS_COMPANIES",
  name: "SmartRecruiters career sites",
  kind: "employer_feed",
  homepage: "https://developers.smartrecruiters.com/docs/posting-api",
  termsUrl: "https://developers.smartrecruiters.com/docs/posting-api",
  attribution: "Published by the employer through the SmartRecruiters Posting API.",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add company identifiers in Admin → Sources (or set SMARTRECRUITERS_COMPANIES)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (company) => {
      const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings`;
      const postings: SrPosting[] = [];
      for (const cc of boardCountries()) {
        for (let offset = 0; offset < 500; offset += 100) {
          const page = await fetchJson<{ content: SrPosting[]; totalFound: number }>(`${base}?limit=100&offset=${offset}&country=${cc.toLowerCase()}`, signal);
          postings.push(...page.content);
          if (offset + 100 >= page.totalFound) break;
        }
      }
      postings.sort((a, b) => b.releasedDate.localeCompare(a.releasedDate));
      const details = await mapLimit(postings.slice(0, SR_DETAILS_PER_COMPANY), 6, (p) =>
        fetchJson<SrDetail>(`${base}/${p.id}`, signal).catch(() => null),
      );
      return postings.map((p, i) => mapSmartRecruiters(p, details[i]));
    }),
};

// --- Workable ---------------------------------------------------------------

type WorkableJob = {
  title: string;
  shortcode: string;
  employment_type?: string;
  telecommuting?: boolean;
  url: string;
  published_on?: string;
  created_at?: string;
  city?: string;
  state?: string;
  country?: string;
  locations?: { country?: string; countryCode?: string; city?: string; region?: string }[];
  description?: string;
};

export function mapWorkable(j: WorkableJob, company: string, countries: string[]): NormalizedJob | null {
  const locs = j.locations?.length ? j.locations : [{ city: j.city, region: j.state, country: j.country, countryCode: "" }];
  const here = locs.find((l) => countries.includes((l.countryCode || "").toUpperCase()) || countries.some((c) => countryName(c) === l.country));
  if (!here) return null;
  const location = [here.city, here.region, here.country].filter(Boolean).join(", ");
  return {
    source: "workable",
    externalId: j.shortcode,
    title: j.title.trim(),
    company,
    location,
    workMode: j.telecommuting ? "remote" : detectWorkMode(location, j.title),
    employmentType: (j.employment_type ?? "").toLowerCase(),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    description: htmlToText(j.description ?? ""),
    url: j.url,
    postedAt: toDate(j.published_on ?? j.created_at),
  };
}

export const workable: SourceDefinition = {
  id: "workable",
  boardsEnv: "WORKABLE_ACCOUNTS",
  name: "Workable career pages",
  kind: "employer_feed",
  homepage: "https://help.workable.com/hc/en-us/articles/115012771647",
  termsUrl: "https://www.workable.com/terms-of-service",
  attribution: "Published by the employer on its Workable careers page.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add Workable account names in Admin → Sources (or set WORKABLE_ACCOUNTS)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (account) => {
      const data = await fetchJson<{ name?: string; jobs?: WorkableJob[] }>(
        `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(account)}?details=true`,
        signal,
      );
      const countries = boardCountries();
      const company = data.name?.trim() || titleCase(account);
      return (data.jobs ?? []).map((j) => mapWorkable(j, company, countries)).filter((j): j is NormalizedJob => j !== null);
    }),
};

// --- SAP SuccessFactors (career-site RSS) ----------------------------------

const cdata = (s: string) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? cdata(m[1]).trim() : "";
};

/**
 * Parse a SuccessFactors RSS feed. Titles end with the location in brackets,
 * which sites format differently: "(Pune, IN)", "(Hyderabad, TG, IN, 500032)",
 * "(Mumbai, India, Maharashtra)".
 */
export function parseSuccessFactorsRss(xml: string, host: string, company: string, countries: string[]): NormalizedJob[] {
  const jobs: NormalizedJob[] = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const rawTitle = htmlToText(tag(item, "title"));
    const m = rawTitle.match(/^(.*)\s+\(([^()]*)\)\s*$/);
    const title = (m ? m[1] : rawTitle).trim();
    const parts = (m ? m[2] : "").split(",").map((s) => s.trim()).filter((s) => s && !/^\d+$/.test(s)); // drop postcodes
    const isCountry = (p: string, c: string) => p.toUpperCase() === c || p.toLowerCase() === countryName(c).toLowerCase();
    const cc = countries.find((c) => parts.some((p) => isCountry(p, c)));
    if (!cc) continue;
    const location = [...parts.filter((p) => !isCountry(p, cc)), countryName(cc)].join(", ");
    const url = decodeEntities(tag(item, "link")).replace(/\?.*$/, ""); // drop the feed's tracking parameters
    const id = decodeEntities(tag(item, "guid")).replace(/\?.*$/, "") || url;
    const reqNumber = id.match(/(\d{5,})\/?$/)?.[1] ?? id; // posting URLs end in /{id}/
    const description = htmlToText(tag(item, "description"));
    jobs.push({
      source: "successfactors",
      externalId: `${host}-${reqNumber}`.slice(0, 180),
      title,
      company,
      location,
      workMode: detectWorkMode(location, title, description.slice(0, 2000)),
      employmentType: "",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      description,
      url,
      postedAt: toDate(tag(item, "pubDate")),
    });
  }
  return jobs;
}

export const successfactors: SourceDefinition = {
  id: "successfactors",
  boardsEnv: "SUCCESSFACTORS_SITES",
  name: "SAP SuccessFactors career sites",
  kind: "employer_feed",
  homepage: "https://www.sap.com/products/hcm/recruiting-software.html",
  attribution: "Published by the employer through its SAP SuccessFactors career-site job feed.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add career-site hosts in Admin → Sources, e.g. jobs.bayer.com=Bayer (or set SUCCESSFACTORS_SITES)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (board) => {
      const { host, label } = parseBoard(board);
      const company = label || titleCase(host.replace(/^(jobs|careers?)\./, "").split(".")[0]);
      const countries = boardCountries();
      const out: NormalizedJob[] = [];
      for (const cc of countries) {
        // The feed is a keyword search; the country name finds that country's newest openings.
        const url = new URL(`https://${host}/feeds/${encodeURIComponent(countryName(cc).toLowerCase())}/?locale=en_US`);
        await assertRobots(url, signal);
        const res = await fetch(url, { signal, headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml" }, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        out.push(...parseSuccessFactorsRss(await res.text(), host, company, countries));
      }
      return out;
    }),
};

// --- Oracle Recruiting Cloud (Taleo's successor) ----------------------------

type OrcRequisition = {
  Id: string;
  Title: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  PrimaryLocationCountry?: string;
  WorkplaceType?: string;
  WorkplaceTypeCode?: string | null;
  JobSchedule?: string | null;
  ShortDescriptionStr?: string | null;
};

type OrcDetail = {
  ExternalDescriptionStr?: string | null;
  ExternalResponsibilitiesStr?: string | null;
  ExternalQualificationsStr?: string | null;
  ExternalPostedStartDate?: string | null;
};

const ORC_PAGE = 25;
/** Listings per site per run, newest first, and how many of those get the full text. */
const ORC_MAX_PER_SITE = 150;
const ORC_DETAILS_PER_SITE = 20;

export function mapOracleRequisition(r: OrcRequisition, host: string, site: string, company: string, detail?: OrcDetail | null): NormalizedJob {
  const full = detail
    ? [detail.ExternalDescriptionStr, detail.ExternalResponsibilitiesStr && `Responsibilities\n${htmlToText(detail.ExternalResponsibilitiesStr)}`, detail.ExternalQualificationsStr && `Qualifications\n${htmlToText(detail.ExternalQualificationsStr)}`]
        .filter(Boolean)
        .map((s, i) => (i === 0 ? htmlToText(s as string) : (s as string)))
        .join("\n\n")
    : "";
  const wt = `${r.WorkplaceType ?? ""} ${r.WorkplaceTypeCode ?? ""}`.toLowerCase();
  const location = r.PrimaryLocation ?? "";
  return {
    source: "oracle",
    externalId: `${host.split(".")[0]}-${site}-${r.Id}`,
    title: r.Title.trim(),
    company,
    location,
    workMode: /remote/.test(wt) ? "remote" : /hybrid/.test(wt) ? "hybrid" : /on.?site/.test(wt) ? "onsite" : detectWorkMode(location),
    employmentType: (r.JobSchedule ?? "").toLowerCase(),
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    description: full || (r.ShortDescriptionStr ?? "").trim(),
    url: `https://${host}/hcmUI/CandidateExperience/en/sites/${encodeURIComponent(site)}/job/${encodeURIComponent(r.Id)}`,
    postedAt: toDate(detail?.ExternalPostedStartDate ?? r.PostedDate),
    ...(full ? {} : { summaryOnly: true }),
  };
}

export const oracle: SourceDefinition = {
  id: "oracle",
  boardsEnv: "ORACLE_SITES",
  name: "Oracle Recruiting Cloud (Taleo) career sites",
  kind: "employer_feed",
  homepage: "https://docs.oracle.com/en/cloud/saas/human-resources/farws/api-recruiting-candidate-experience-job-requisitions.html",
  termsUrl: "https://docs.oracle.com/en/cloud/saas/human-resources/farws/api-recruiting-candidate-experience-job-requisitions.html",
  attribution: "Published by the employer on its Oracle Recruiting Cloud career site.",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add career sites in Admin → Sources as host/SITE=Company (or set ORACLE_SITES)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (board) => {
      const { host, site, label } = parseBoard(board);
      if (!site) throw new Error(`Oracle site "${board}" needs host/SITE`);
      const company = label || titleCase(host.split(".")[0]);
      const api = `https://${host}/hcmRestApi/resources/latest`;
      const reqs: OrcRequisition[] = [];
      for (const cc of boardCountries()) {
        for (let offset = 0; offset < ORC_MAX_PER_SITE; offset += ORC_PAGE) {
          const url = new URL(
            `${api}/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=${site},location=${encodeURIComponent(countryName(cc))},sortBy=POSTING_DATES_DESC,limit=${ORC_PAGE},offset=${offset}`,
          );
          if (offset === 0) await assertRobots(url, signal);
          const data = await fetchJson<{ items: { TotalJobsCount?: number; requisitionList?: OrcRequisition[] }[] }>(url.href, signal);
          const page = data.items?.[0];
          const list = (page?.requisitionList ?? []).filter((r) => !r.PrimaryLocationCountry || r.PrimaryLocationCountry.toUpperCase() === cc);
          reqs.push(...list);
          if ((page?.requisitionList?.length ?? 0) < ORC_PAGE || offset + ORC_PAGE >= (page?.TotalJobsCount ?? 0)) break;
        }
      }
      const details = await mapLimit(reqs.slice(0, ORC_DETAILS_PER_SITE), 5, (r) =>
        fetchJson<{ items: OrcDetail[] }>(
          `${api}/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=${encodeURIComponent(`"${r.Id}"`)},siteNumber=${site}`,
          signal,
        )
          .then((d) => d.items?.[0] ?? null)
          .catch(() => null),
      );
      return reqs.map((r, i) => mapOracleRequisition(r, host, site, company, details[i]));
    }),
};
