import "server-only";
import { after } from "next/server";
import type { Job, Prisma } from "@prisma/client";
import { db, parseJson } from "../db";
import { log } from "../log";
import { getBaseResume, getProfile } from "../profile";
import { defaultPreferences, emptyResume, type JobPreferences, type ResumeData } from "../resume/schema";
import { embedTexts, embeddingsEnabled } from "./embeddings";
import { readEnrichment, type JobEnrichment, type JobRequirements, type PostedOn } from "./enrich";
import { cityMatches, jobAvailableIn, storedGeo } from "../geo/detect";
import { fetchForCountry, jobId, MAX_LISTING_AGE_DAYS, refreshSources } from "./ingest";
import { buildMatchContext, familiesOf, scoreJob, type Feedback, type MatchContext, type MatchResult } from "./rank";
import { activeSources, sourceMeta } from "./registry";
import { salaryInsight } from "./salary";
import type { NormalizedJob, SourceStatus } from "./types";
import { matchesKeywords } from "./util";

export { jobId };

export const STRONG_MATCH = 60;

/**
 * Expired jobs stay visible (marked) until the next daily refresh, which runs
 * at 01:00 UTC; after that they drop out of the feed.
 */
export function expiryCutoff(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 1));
  if (d > now) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}
export const REMOTE_ANYWHERE = "REMOTE";
const LIVE_WINDOW_DAYS = 7; // listings not re-seen by their source within this window are dropped

export function jobRowToNormalized(j: Job): NormalizedJob &
  Pick<Job, "embedding" | "salaryYearlyUsd" | "country" | "countries" | "city" | "remoteScope" | "expiredAt"> & {
    sourceUrl: string;
    verifiedLink: boolean;
    requirements: JobRequirements | null;
    enrichment: JobEnrichment | null;
    postedOn: PostedOn[];
    analysed: boolean;
  } {
  const e = readEnrichment(j);
  return {
    ...j,
    workMode: j.workMode as NormalizedJob["workMode"],
    // The employer's own posting (once found) replaces the aggregator's link and snippet.
    url: e?.applyUrl ?? j.url,
    sourceUrl: j.url,
    verifiedLink: !!e?.applyUrl,
    description: e?.fullDescription ?? j.description,
    requirements: e?.requirements ?? null,
    enrichment: e,
    postedOn: e?.postedOn ?? [],
    // The full analysis (links, salary) has run, not just the batch skill read.
    analysed: !!(j.enrichedAt && e && !e.searchLimited),
  };
}

export type SearchFilters = {
  q?: string;
  skills?: string;
  company?: string;
  location?: string;
  /** ISO country code, or REMOTE_ANYWHERE for remote-only */
  country?: string;
  city?: string;
  /** With a country: also show remote roles open to it (default true) */
  includeRemote?: boolean;
  /** The searching user (some APIs require their IP and user agent). */
  client?: { ip: string; userAgent: string };
  workMode?: string[];
  salaryMin?: number;
  postedWithinDays?: number;
  seniority?: string[];
  jobType?: string[];
  sources?: string[];
  onlySalary?: boolean;
  view?: "all" | "saved" | "hidden" | "applied";
  sort?: "match" | "date";
  page?: number;
  pageSize?: number;
  refresh?: boolean;
  /** Only jobs first seen after this date (alerts) */
  newSince?: Date;
  /** Experience levels (internship, entry, associate, mid_senior, director, executive) */
  levels?: string[];
  /** Only the total is needed (filter menus) - skip fetching from sources */
  countOnly?: boolean;
};

export type JobCard = {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  workMode: string;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryYearlyUsd: number | null;
  postedAt: string | null;
  source: string;
  sourceName: string;
  sourceKind: string;
  attribution: string;
  url: string;
  /** The aggregator listing (e.g. Adzuna) when `url` is the employer posting. */
  sourceUrl: string;
  /** `url` is the original posting, verified on the employer site. */
  verifiedLink: boolean;
  /** Marked "no longer accepting applications" (ISO date), or null. */
  expiredAt: string | null;
  /** The same job on LinkedIn, Naukri etc. */
  postedOn: PostedOn[];
  analysed: boolean;
  match: MatchResult;
  saved: boolean;
  hidden: boolean;
  status: string;
};

export async function loadUserContext(userId: string, resumeVersionId?: string | null) {
  const [base, prefs] = await Promise.all([getBaseResume(userId, resumeVersionId), db.preferences.findUnique({ where: { userId } })]);
  return {
    resume: base?.data ?? emptyResume(),
    resumeName: base?.name ?? "Primary profile",
    prefs: { ...defaultPreferences(), ...parseJson<Partial<JobPreferences>>(prefs?.data, {}) },
    hasProfile: !!base,
  };
}

async function profileEmbedding(userId: string, resume: ResumeData): Promise<number[] | null> {
  if (!embeddingsEnabled()) return null;
  const p = await db.profile.findUnique({ where: { userId }, select: { embedding: true } });
  if (p?.embedding) return parseJson<number[] | null>(p.embedding, null);
  try {
    const text = [resume.headline, resume.summary, ...resume.experience.flatMap((e) => [e.title, ...e.highlights])].join("\n");
    const [vec] = await embedTexts([text], "query");
    await db.profile.update({ where: { userId }, data: { embedding: JSON.stringify(vec) } });
    return vec;
  } catch (e) {
    log.warn("embed.profile_failed", { message: String(e) });
    return null;
  }
}

export async function loadFeedback(userId: string): Promise<Feedback> {
  const states = await db.userJob.findMany({
    where: { userId, OR: [{ saved: true }, { hidden: true }, { status: { not: "none" } }] },
    include: { job: { select: { title: true, company: true } } },
    take: 300,
    orderBy: { updatedAt: "desc" },
  });
  return {
    liked: states.filter((s) => !s.hidden && (s.saved || s.status !== "none")).map((s) => s.job),
    disliked: states.filter((s) => s.hidden).map((s) => s.job),
  };
}

export async function loadMatchContext(userId: string, resumeVersionId?: string | null): Promise<MatchContext & { hasProfile: boolean }> {
  const { resume, prefs, hasProfile } = await loadUserContext(userId, resumeVersionId);
  const [feedback, emb] = await Promise.all([loadFeedback(userId), profileEmbedding(userId, resume)]);
  return { ...buildMatchContext(resume, prefs, { feedback, profileEmbedding: emb }), hasProfile };
}

export function toCard(j: ReturnType<typeof jobRowToNormalized>, match: MatchResult, state?: { saved: boolean; hidden: boolean; status: string }): JobCard {
  const meta = sourceMeta(j.source);
  return {
    id: jobId(j),
    title: j.title,
    company: j.company,
    location: j.location,
    country: j.country,
    city: j.city,
    workMode: j.workMode,
    employmentType: j.employmentType,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryCurrency: j.salaryCurrency,
    salaryPeriod: j.salaryPeriod,
    salaryYearlyUsd: j.salaryYearlyUsd,
    postedAt: j.postedAt?.toISOString() ?? null,
    source: j.source,
    sourceName: meta.name,
    sourceKind: meta.kind,
    attribution: meta.attribution,
    url: j.url,
    sourceUrl: j.sourceUrl,
    verifiedLink: j.verifiedLink,
    postedOn: j.postedOn,
    expiredAt: j.expiredAt?.toISOString() ?? null,
    analysed: j.analysed,
    match,
    saved: state?.saved ?? false,
    hidden: state?.hidden ?? false,
    status: state?.status ?? "none",
  };
}

async function sourceStatuses(ids: string[]): Promise<SourceStatus[]> {
  const runs = await db.sourceRun.findMany({ where: { source: { in: ids } }, orderBy: { startedAt: "desc" }, take: ids.length * 5 });
  return ids.map((id) => {
    const last = runs.find((r) => r.source === id);
    return {
      id,
      name: sourceMeta(id).name,
      ok: last?.ok ?? true,
      cached: true,
      count: last?.count ?? 0,
      error: last && !last.ok ? `${last.error ?? "Failed"} (showing listings from the last successful update)` : undefined,
      updatedAt: runs.find((r) => r.source === id && r.ok)?.startedAt.toISOString(),
    };
  });
}

export async function searchJobs(userId: string, f: SearchFilters) {
  const ctx = await loadMatchContext(userId);
  const split = (s?: string) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const titleTerms = split(f.q);
  const skillTerms = split(f.skills);
  const keywords = [...titleTerms, ...skillTerms];
  const country = f.country && f.country !== REMOTE_ANYWHERE ? f.country.toUpperCase() : null;
  const includeRemote = f.includeRemote ?? true;

  const active = (await activeSources()).map((s) => s.def.id).filter((id) => !f.sources?.length || f.sources.includes(id));
  const since = new Date(Date.now() - LIVE_WINDOW_DAYS * 86_400_000);

  // Country-aware sources (e.g. Adzuna India) are queried for this search too,
  // but never block results for more than a few seconds.
  // Listings are never older than 30 days; "Date posted" narrows that further.
  const maxAge = Math.max(1, Math.min(f.postedWithinDays ?? MAX_LISTING_AGE_DAYS, MAX_LISTING_AGE_DAYS));
  const cutoff = new Date(Date.now() - maxAge * 86_400_000);
  if (country && !f.newSince && !f.countOnly)
    await Promise.race([fetchForCountry(country, titleTerms.length ? titleTerms : skillTerms, f.client, maxAge, titleTerms.length > 0), new Promise((r) => setTimeout(r, 8000))]).catch(() => undefined);

  if (f.countOnly) {
    // Live counts for the filter menus never trigger fetches.
  } else if (f.refresh) {
    await refreshSources({ force: true, onlyIds: active, extraKeywords: keywords });
  } else if (active.length && (await db.job.count({ where: { source: { in: active }, lastSeenAt: { gte: since } } })) === 0) {
    await refreshSources({ onlyIds: active }); // cold start: wait for the first fetch
  } else {
    // Keep sources fresh after responding (TTL-aware); survives serverless shutdown.
    after(() => refreshSources().catch(() => undefined));
  }

  const includeImports = !f.sources?.length || f.sources.includes("user_link");
  const where: Prisma.JobWhereInput = {
    AND: [
      { OR: [{ source: { in: active }, importedById: null, lastSeenAt: { gte: since } }, ...(includeImports ? [{ importedById: userId }] : [])] },
      ...(f.workMode?.length ? [{ workMode: { in: f.workMode } }] : []),
      ...(f.company ? [{ company: { contains: f.company } }] : []),
      // Undated listings (e.g. pasted jobs) only appear in the default 30-day view.
      { OR: [{ postedAt: { gte: cutoff } }, ...(maxAge >= MAX_LISTING_AGE_DAYS ? [{ postedAt: null }] : [])] },
      ...(f.salaryMin ? [{ salaryYearlyUsd: { gte: f.salaryMin } }] : []),
      ...(f.onlySalary ? [{ salaryYearlyUsd: { not: null } }] : []),
      ...(f.newSince ? [{ firstSeenAt: { gt: f.newSince } }] : []),
      // Expired jobs leave the feed at the next daily refresh (kept in saved/applied views).
      ...(f.view === "saved" || f.view === "applied" ? [] : [{ OR: [{ expiredAt: null }, { expiredAt: { gt: expiryCutoff() } }] }]),
      ...(f.country === REMOTE_ANYWHERE ? [{ workMode: "remote" }] : []),
      // Coarse DB pre-filter; exact eligibility is checked below.
      ...(country ? [{ OR: [{ countries: { contains: country } }, ...(includeRemote ? [{ workMode: "remote" }, { remoteScope: { not: null } }] : [])] }] : []),
    ],
  };
  const rows = await db.job.findMany({ where, take: 5000 });

  const states = await db.userJob.findMany({ where: { userId } });
  const stateMap = new Map(states.map((s) => [s.jobId, s]));

  const seen = new Set<string>();
  const candidates = rows.map(jobRowToNormalized).filter((j) => {
    const st = stateMap.get(jobId(j));
    if (f.view === "saved" && !st?.saved) return false;
    if (f.view === "hidden" ? !st?.hidden : st?.hidden) return false;
    if (f.view === "applied" && (!st || st.status === "none")) return false;
    // Title terms must appear in the job title or company - not just somewhere
    // in the description - so "procurement" doesn't return sales roles.
    if (titleTerms.length && !titleTerms.some((t) => `${j.title} ${j.company}`.toLowerCase().includes(t.toLowerCase()))) return false;
    if (skillTerms.length && !matchesKeywords(j, skillTerms)) return false;
    if (country && !jobAvailableIn(storedGeo(j), country, includeRemote)) return false;
    if (f.city && !cityMatches(j.city, j.location, f.city)) return false;
    if (f.location && j.workMode !== "remote" && !j.location.toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.jobType?.length && !f.jobType.some((t) => j.employmentType.toLowerCase().includes(t))) return false;
    // De-duplicate the same role cross-posted on several sources.
    const k = `${j.title}|${j.company.replace(/\s*\(sample\)$/, "")}`.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  let cards = candidates.map((j) => toCard(j, scoreJob(j, ctx), stateMap.get(jobId(j))));
  if (f.seniority?.length) cards = cards.filter((c) => f.seniority!.includes(c.match.seniority));
  if (f.levels?.length) cards = cards.filter((c) => f.levels!.includes(c.match.level));
  cards.sort((a, b) =>
    f.sort === "date"
      ? (b.postedAt ?? "").localeCompare(a.postedAt ?? "")
      : b.match.score - a.match.score || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""),
  );

  const pageSize = Math.min(50, f.pageSize ?? 12);
  const page = Math.max(1, f.page ?? 1);
  return {
    total: cards.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(cards.length / pageSize)),
    jobs: cards.slice((page - 1) * pageSize, page * pageSize),
    sources: await sourceStatuses(active),
    companies: [...new Set(cards.map((c) => c.company))].slice(0, 50),
    strongMatches: cards.filter((c) => c.match.score >= STRONG_MATCH).length,
    top: cards.slice(0, 3),
    semantic: ctx.profileEmbedding ? "embeddings" : "lexical",
  };
}

/** Where this job's pay sits among similar roles we've seen recently. */
export async function salaryInsightFor(job: { title: string; salaryYearlyUsd: number | null }) {
  const fams = familiesOf(job.title);
  const rows = await db.job.findMany({
    where: { salaryYearlyUsd: { not: null }, lastSeenAt: { gte: new Date(Date.now() - 30 * 86_400_000) }, source: { not: "demo" } },
    select: { title: true, salaryYearlyUsd: true },
    take: 5000,
  });
  const similar = rows.filter((r) => (fams.length ? familiesOf(r.title).some((f) => fams.includes(f)) : true));
  const insight = salaryInsight(similar.map((r) => r.salaryYearlyUsd!), job.salaryYearlyUsd);
  return insight ? { ...insight, family: fams[0] ?? "all roles" } : null;
}

export { getProfile };
