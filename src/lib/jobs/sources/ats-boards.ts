// More employer career sites, each through the public feed its hiring
// platform publishes for job seekers and job boards: SmartRecruiters (Posting
// API), Workable (careers-page widget API), SAP SuccessFactors (career-site
// RSS) and Oracle Recruiting Cloud, the successor to Taleo (candidate
// experience REST API). Which employers to include is configured in Admin →
// Sources. Listings are limited to EMPLOYER_BOARD_COUNTRIES (default India),
// and SuccessFactors / Oracle hosts are only read where robots.txt allows it.

import { countryByCode, detectLocation } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { USER_AGENT, decodeEntities, detectWorkMode, fetchJson, htmlToText, robotsTxtAllows, rssItems, rssTag as tag, toDate } from "../util";
import { boardCountries as allBoardCountries, forEachBoard, titleCase } from "./employer-boards";

/** Concrete ISO codes to query ("ALL" means no country filter, which these APIs need a value for). */
export const boardCountries = () => {
  const list = allBoardCountries().filter((c) => c !== "ALL");
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

/** Full job ads fetched per company per run; the rest are filled in by the background description task. */
const SR_DETAILS_PER_COMPANY = 40;

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
  defaultBoards: ["BoschGroup", "ServiceNow", "Experian", "AbbVie", "Freshworks", "Ubisoft2"],
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
  const local = locs.find((l) => countries.includes((l.countryCode || "").toUpperCase()) || countries.some((c) => countryName(c) === l.country));
  // Fully remote roles are kept too; their location shows where the team sits.
  const here = local ?? (j.telecommuting ? locs[0] : undefined);
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
  defaultBoards: ["huggingface"],
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

/**
 * Parse a SuccessFactors RSS feed. Titles end with the location in brackets,
 * which sites format differently: "(Pune, IN)", "(Hyderabad, TG, IN, 500032)",
 * "(Mumbai, India, Maharashtra)".
 */
export function parseSuccessFactorsRss(xml: string, host: string, company: string, countries: string[]): NormalizedJob[] {
  const jobs: NormalizedJob[] = [];
  for (const item of rssItems(xml)) {
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
  defaultBoards: ["careers.tatamotors.com=Tata Motors"],
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
/** Listings per site per run, newest first, and how many of those get the full text here (the rest in the background). */
const ORC_MAX_PER_SITE = 150;
const ORC_DETAILS_PER_SITE = 30;

/** Oracle's candidate-experience API for one requisition (also used by the background description task). */
export async function fetchOracleDetail(host: string, site: string, id: string, signal: AbortSignal): Promise<OrcDetail | null> {
  const d = await fetchJson<{ items: OrcDetail[] }>(
    `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=${encodeURIComponent(`"${id}"`)},siteNumber=${site}`,
    signal,
  );
  return d.items?.[0] ?? null;
}

/** The full text of an Oracle requisition ("" when it has none). */
export function oracleDescription(detail: OrcDetail) {
  return [
    detail.ExternalDescriptionStr && htmlToText(detail.ExternalDescriptionStr),
    detail.ExternalResponsibilitiesStr && `Responsibilities\n${htmlToText(detail.ExternalResponsibilitiesStr)}`,
    detail.ExternalQualificationsStr && `Qualifications\n${htmlToText(detail.ExternalQualificationsStr)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function mapOracleRequisition(r: OrcRequisition, host: string, site: string, company: string, detail?: OrcDetail | null): NormalizedJob {
  const full = detail ? oracleDescription(detail) : "";
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
  // The API host is the "*.fa.*.oraclecloud.com" one, not the company's public careers domain.
  defaultBoards: ["eeho.fa.us2.oraclecloud.com/CX_45001=Oracle"],
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
      if (!site) throw new Error(`Oracle site "${board}" needs host/SITE, e.g. eeho.fa.us2.oraclecloud.com/CX_45001`);      const company = label || titleCase(host.split(".")[0]);
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
      const details = await mapLimit(reqs.slice(0, ORC_DETAILS_PER_SITE), 5, (r) => fetchOracleDetail(host, site, r.Id, signal).catch(() => null));
      return reqs.map((r, i) => mapOracleRequisition(r, host, site, company, details[i]));
    }),
};

// --- Workday (career-site "cxs" JSON API) ------------------------------------
// The same public API every Workday career site's own pages call. Boards are
// "tenant.wdN/Site=Company", e.g. "intel.wd1/External=Intel".

type WdPosting = { title: string; externalPath: string; locationsText?: string; postedOn?: string; bulletFields?: string[] };
type WdDetail = {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    startDate?: string;
    timeType?: string;
    remoteType?: string;
    jobReqId?: string;
    externalUrl?: string;
  };
  hiringOrganization?: { name?: string };
};

const WD_PAGE = 20;
// Background refresh per site (24 sites); the rest arrive through keyword searches and later refreshes.
const WD_MAX_PER_SITE = 60;
const WD_DETAILS_PER_SITE = 8;

/** "intel.wd1" or "intel.wd1.myworkdayjobs.com" -> host + tenant. */
export function workdayHost(host: string) {
  const full = host.endsWith(".myworkdayjobs.com") ? host : `${host}.myworkdayjobs.com`;
  return { host: full, tenant: full.split(".")[0] };
}

/** "Posted Today" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" -> a date. */
export function workdayPostedOn(text = "", now = Date.now()): Date | null {
  const t = text.toLowerCase();
  if (/today/.test(t)) return new Date(now);
  if (/yesterday/.test(t)) return new Date(now - 86_400_000);
  const n = Number(t.match(/(\d+)\+?\s*days?/)?.[1]);
  return Number.isFinite(n) && n > 0 ? new Date(now - n * 86_400_000) : null;
}

export async function fetchWorkdayDetail(host: string, tenant: string, site: string, externalPath: string, signal: AbortSignal) {
  return fetchJson<WdDetail>(`https://${host}/wday/cxs/${tenant}/${site}${externalPath}`, signal);
}

/** The full text and exact location of a Workday posting. */
export function workdayDetailFields(d: WdDetail) {
  const info = d.jobPostingInfo ?? {};
  const locations = [info.location, ...(info.additionalLocations ?? [])].filter(Boolean) as string[];
  return {
    description: htmlToText(info.jobDescription ?? ""),
    location: locations.join(" · "),
    postedAt: toDate(info.startDate),
    employmentType: (info.timeType ?? "").toLowerCase(),
    remote: /remote/i.test(info.remoteType ?? ""),
  };
}

export const workday: SourceDefinition = {
  id: "workday",
  boardsEnv: "WORKDAY_SITES",
  defaultBoards: [
    "intel.wd1/External=Intel",
    "nvidia.wd5/NVIDIAExternalCareerSite=NVIDIA",
    "salesforce.wd12/External_Career_Site=Salesforce",
    "adobe.wd5/external_experienced=Adobe",
    "mastercard.wd1/CorporateCareers=Mastercard",
    "hpe.wd5/Jobsathpe=Hewlett Packard Enterprise",
    "pwc.wd3/Global_Experienced_Careers=PwC",
    // Large employers with operations, finance, procurement and shared-service teams in India.
    "accenture.wd103/AccentureCareers=Accenture",
    "citi.wd5/2=Citi",
    "statestreet.wd1/Global=State Street",
    "gsk.wd5/GSKCareers=GSK",
    "novartis.wd3/Novartis_Careers=Novartis",
    "sanofi.wd3/SanofiCareers=Sanofi",
    "pfizer.wd1/PfizerCareers=Pfizer",
    "astrazeneca.wd3/Careers=AstraZeneca",
    "jci.wd5/JCI=Johnson Controls",
    "3m.wd1/Search=3M",
    "philips.wd3/jobs-and-careers=Philips",
    "motorolasolutions.wd5/Careers=Motorola Solutions",
    "target.wd5/targetcareers=Target",
    "lowes.wd5/LWS_External_CS=Lowe's",
    "nike.wd1/nke=Nike",
    "bakerhughes.wd5/BakerHughes=Baker Hughes",
    "boeing.wd1/EXTERNAL_CAREERS=Boeing",
  ],
  name: "Workday career sites",
  // Searched with the user's keywords too (e.g. "procurement"), not just in the background.
  keywordSearch: true,
  kind: "employer_feed",
  homepage: "https://www.workday.com/en-us/products/talent-management/recruiting.html",
  attribution: "Published by the employer on its Workday career site.",
  cacheTtlMs: 3 * 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add career sites in Admin → Sources as tenant.wdN/Site=Company (or set WORKDAY_SITES)."),
  queryIndependent: true,
  fetchJobs: (query, signal, ctx) =>
    forEachBoard(ctx.boards, async (board) => {
      const searching = query.keywords.length > 0;
      // Background: newest jobs in the country, with full text for the first few. Keyword search:
      // the matching jobs only, listed fast (their full text loads in the background).
      const maxPerSite = searching ? 40 : WD_MAX_PER_SITE;
      const detailsPerSite = searching ? 0 : WD_DETAILS_PER_SITE;
      const ccs = query.country ? [query.country.toUpperCase()] : boardCountries();
      const parsed = parseBoard(board);
      if (!parsed.site) throw new Error(`Workday site "${board}" needs tenant.wdN/Site`);
      const { host, tenant } = workdayHost(parsed.host);
      const site = parsed.site;
      const company = parsed.label || titleCase(tenant);
      const api = new URL(`https://${host}/wday/cxs/${tenant}/${site}/jobs`);
      await assertRobots(api, signal);
      const out: NormalizedJob[] = [];
      const seen = new Set<string>();
      for (const cc of ccs) {
        const country = countryName(cc);
        const searchText = searching ? `${query.keywords.join(" ")} ${query.location || country}` : country;
        const postings: WdPosting[] = [];
        for (let offset = 0; offset < maxPerSite; offset += WD_PAGE) {
          const page = await fetchJson<{ total?: number; jobPostings?: WdPosting[] }>(api.href, signal, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appliedFacets: {}, limit: WD_PAGE, offset, searchText }),
          });
          postings.push(...(page.jobPostings ?? []).filter((p) => p?.title && p.externalPath));
          if ((page.jobPostings?.length ?? 0) < WD_PAGE || offset + WD_PAGE >= (page.total ?? 0)) break;
        }
        const details = await mapLimit(postings.slice(0, detailsPerSite), 4, (p) => fetchWorkdayDetail(host, tenant, site, p.externalPath, signal).catch(() => null));
        postings.forEach((p, i) => {
          const d = details[i] ? workdayDetailFields(details[i]!) : null;
          // "3 Locations" says nothing; the search was for this country, so name it until the detail is read.
          const listed = p.locationsText && !/^\d+\s+locations?$/i.test(p.locationsText) ? p.locationsText : country;
          const location = d?.location || listed;
          if (d?.location && !detectLocation(location).countries.includes(cc) && !d.remote) return; // matched the word, not the place
          const reqId = p.bulletFields?.[0] ?? p.externalPath.split("_").pop() ?? p.externalPath;
          const externalId = `${tenant}-${site}-${reqId}`.slice(0, 180);
          if (seen.has(externalId)) return;
          seen.add(externalId);
          out.push({
            source: "workday",
            externalId,
            title: p.title.trim(),
            company,
            location,
            workMode: d?.remote ? "remote" : detectWorkMode(location, p.title),
            employmentType: d?.employmentType ?? "",
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryPeriod: null,
            description: d?.description || `${p.title} at ${company}. ${location}.`,
            url: `https://${host}/${site}${p.externalPath}`,
            postedAt: d?.postedAt ?? workdayPostedOn(p.postedOn),
            ...(d?.description ? {} : { summaryOnly: true }),
          });
        });
      }
      return out;
    }),
};
