// Employer career sites that publish their openings through official,
// unauthenticated job-board APIs (Greenhouse, Lever, Ashby). Which employers
// to include is configured via env vars - nothing is crawled.

import { detectLocation, jobAvailableIn } from "../../geo/detect";
import type { NormalizedJob, SourceDefinition } from "../types";
import { csvEnv, detectWorkMode, fetchJson, htmlToText, toDate } from "../util";

/** Listings from several boards, plus a note for each board that failed or returned nothing. */
export type BoardJobs = NormalizedJob[] & { warnings?: string[] };

/**
 * Fetch every board; one broken board never hides the others. Throws only when
 * every board fails. Boards that fail or come back empty are reported as
 * warnings so the admin page can show the source as degraded, not "Active".
 */
export async function forEachBoard(boards: string[], fn: (board: string) => Promise<NormalizedJob[]>): Promise<BoardJobs> {
  const results = await Promise.allSettled(boards.map(fn));
  const ok: BoardJobs = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const warnings = results.flatMap((r, i) =>
    r.status === "rejected" ? [`${boards[i]}: ${r.reason?.message ?? "failed"}`] : r.value.length === 0 ? [`${boards[i]}: no current listings`] : [],
  );
  if (results.length && results.every((r) => r.status === "rejected"))
    throw new Error(warnings.slice(0, 3).join("; ") || "All boards failed");
  if (warnings.length) ok.warnings = warnings;
  return ok;
}

/** ISO codes (upper case) to collect from employer platforms. */
export const boardCountries = () => {
  const list = csvEnv("EMPLOYER_BOARD_COUNTRIES").map((c) => c.toUpperCase());
  return list.length ? list : ["IN"];
};

/**
 * Global employers post thousands of roles; keep the ones in the countries we
 * serve, plus remote roles open to them. Set EMPLOYER_BOARD_COUNTRIES=ALL to keep everything.
 */
export function inBoardCountries(location: string, workMode: string) {
  const countries = boardCountries();
  if (countries.includes("ALL")) return true;
  const g = detectLocation(location);
  const geo = { ...g, remote: g.remote || workMode === "remote" };
  // Remote roles count when they're open to the country (worldwide, or its region).
  return countries.some((c) => jobAvailableIn(geo, c, true));
}

export const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** "openai=OpenAI" -> token "openai", company "OpenAI" (the label is optional). */
export function splitBoard(board: string) {
  const [token, label] = board.split("=").map((s) => s.trim());
  return { token, company: label || titleCase(token) };
}

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at: string;
  first_published?: string;
  location: { name: string };
  absolute_url: string;
  content: string;
  company_name?: string;
};

export const greenhouse: SourceDefinition = {
  id: "greenhouse",
  boardsEnv: "GREENHOUSE_BOARDS",
  defaultBoards: ["databricks=Databricks", "okta=Okta", "zscaler=Zscaler", "rubrik=Rubrik", "mongodb=MongoDB", "gitlab=GitLab", "stripe=Stripe", "razorpaysoftwareprivatelimited=Razorpay", "hackerrank=HackerRank", "groww=Groww", "druva=Druva", "airbnb=Airbnb", "elastic=Elastic", "twilio=Twilio", "coinbase=Coinbase"],
  name: "Greenhouse career boards",
  kind: "employer_feed",
  homepage: "https://developers.greenhouse.io/job-board.html",
  termsUrl: "https://developers.greenhouse.io/job-board.html",
  attribution: "Published by the employer through the Greenhouse Job Board API.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add employer board tokens in Admin → Sources (or set GREENHOUSE_BOARDS)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (entry) => {
      const { token: board, company } = splitBoard(entry);
      const data = await fetchJson<{ jobs: GreenhouseJob[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
        signal,
      );
      return data.jobs
        .map((j) => {
          const description = htmlToText(j.content ?? "");
          return {
            source: "greenhouse",
            externalId: `${board}-${j.id}`,
            title: j.title,
            company: entry.includes("=") ? company : j.company_name ?? company,
            location: j.location?.name ?? "",
            workMode: detectWorkMode(j.location?.name, j.title),
            employmentType: "",
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryPeriod: null,
            description,
            url: j.absolute_url,
            postedAt: toDate(j.first_published ?? j.updated_at),
          };
        })
        .filter((j) => inBoardCountries(j.location, j.workMode));
    }),
};

type LeverPosting = {
  id: string;
  text: string;
  categories: { location?: string; commitment?: string; team?: string };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  hostedUrl: string;
  createdAt: number;
  workplaceType?: string;
  salaryRange?: { min: number; max: number; currency: string; interval: string };
};

export const lever: SourceDefinition = {
  id: "lever",
  boardsEnv: "LEVER_COMPANIES",
  defaultBoards: ["zeta=Zeta", "meesho=Meesho", "paytm=Paytm", "cred=CRED", "mindtickle=Mindtickle", "spotify=Spotify"],
  name: "Lever career sites",
  kind: "employer_feed",
  homepage: "https://github.com/lever/postings-api",
  termsUrl: "https://github.com/lever/postings-api",
  attribution: "Published by the employer through the Lever Postings API.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add employer handles in Admin → Sources (or set LEVER_COMPANIES)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (entry) => {
      const { token, company } = splitBoard(entry);
      const data = await fetchJson<LeverPosting[]>(
        `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`,
        signal,
      );
      return data
        .map((p) => {
          const lists = (p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
          const wt = p.workplaceType;
          return {
            source: "lever",
            externalId: p.id,
            title: p.text,
            company,
            location: p.categories?.location ?? "",
            workMode: wt === "remote" ? "remote" as const : wt === "hybrid" ? "hybrid" as const : wt === "onsite" ? "onsite" as const : detectWorkMode(p.categories?.location),
            employmentType: p.categories?.commitment ?? "",
            salaryMin: p.salaryRange?.min ?? null,
            salaryMax: p.salaryRange?.max ?? null,
            salaryCurrency: p.salaryRange?.currency ?? null,
            salaryPeriod: p.salaryRange ? (/hour/i.test(p.salaryRange.interval) ? "hour" : /month/i.test(p.salaryRange.interval) ? "month" : "year") : null,
            description: [p.descriptionPlain, lists, p.additionalPlain].filter(Boolean).join("\n\n"),
            url: p.hostedUrl,
            postedAt: toDate(p.createdAt),
          };
        })
        .filter((j) => inBoardCountries(j.location, j.workMode));
    }),
};

type AshbyJob = {
  id: string;
  title: string;
  location: string;
  isRemote: boolean;
  workplaceType?: string;
  employmentType?: string;
  publishedAt: string;
  jobUrl: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
  compensation?: {
    summaryComponents?: { compensationType: string; interval: string; currencyCode: string; minValue: number | null; maxValue: number | null }[];
  };
};

export const ashby: SourceDefinition = {
  id: "ashby",
  boardsEnv: "ASHBY_BOARDS",
  defaultBoards: ["openai=OpenAI", "notion=Notion", "sarvam=Sarvam AI", "airwallex=Airwallex", "atlan=Atlan", "supabase=Supabase"],
  name: "Ashby job boards",
  kind: "employer_feed",
  homepage: "https://developers.ashbyhq.com/docs/public-job-posting-api",
  termsUrl: "https://developers.ashbyhq.com/docs/public-job-posting-api",
  attribution: "Published by the employer through the Ashby public job posting API.",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 30,
  missingConfig: (ctx) => (ctx.boards.length ? null : "Add employer board names in Admin → Sources (or set ASHBY_BOARDS)."),
  queryIndependent: true,
  fetchJobs: (_query, signal, ctx) =>
    forEachBoard(ctx.boards, async (entry) => {
      const { token: board, company } = splitBoard(entry);
      const data = await fetchJson<{ jobs: AshbyJob[] }>(
        `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
        signal,
      );
      return data.jobs
        .map((j) => {
          const salary = j.compensation?.summaryComponents?.find((c) => c.compensationType === "Salary");
          const wt = (j.workplaceType ?? "").toLowerCase();
          return {
            source: "ashby",
            externalId: j.id,
            title: j.title,
            company,
            location: j.location ?? "",
            workMode: j.isRemote || wt === "remote" ? "remote" as const : wt === "hybrid" ? "hybrid" as const : wt === "onsite" ? "onsite" as const : detectWorkMode(j.location),
            employmentType: (j.employmentType ?? "").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
            salaryMin: salary?.minValue ?? null,
            salaryMax: salary?.maxValue ?? null,
            salaryCurrency: salary?.currencyCode ?? null,
            salaryPeriod: salary ? (/hour/i.test(salary.interval) ? "hour" : /month/i.test(salary.interval) ? "month" : "year") : null,
            description: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ""),
            url: j.jobUrl,
            postedAt: toDate(j.publishedAt),
          };
        })
        .filter((j) => inBoardCountries(j.location, j.workMode));
    }),
};
