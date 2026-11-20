import "server-only";
// Background ingestion: each source is fetched on its own cache timer and the
// results are stored in the Job table, so searches are fast DB reads. Runs
// from instrumentation.ts (long-lived servers) and /api/cron/* (serverless).

import { db } from "../db";
import { detectLocation, geoFields } from "../geo/detect";
import { log } from "../log";
import { rateLimit } from "../rate-limit";
import { embedTexts, embeddingsEnabled, jobEmbeddingText } from "./embeddings";
import { activeSources } from "./registry";
import { normalizeSalaryYearlyUsd } from "./salary";
import type { BoardJobs } from "./sources/employer-boards";
import { expandTitleTerms } from "./synonyms";
import type { NormalizedJob, SourceDefinition } from "./types";
import { csvEnv } from "./util";

export const jobId = (j: Pick<NormalizedJob, "source" | "externalId">) => `${j.source}:${j.externalId}`;

/** Listings older than this are never fetched or shown. */
export const MAX_LISTING_AGE_DAYS = 30;

let running: Promise<IngestReport> | null = null;

export type IngestReport = { ran: { id: string; ok: boolean; count: number; error?: string; skipped?: string }[] };

/**
 * Save a source's listings. New listings are inserted in bulk; listings we
 * already have only get "still live" timestamps, plus a row update when
 * something the user sees changed. A snippet never overwrites a complete
 * description we already loaded.
 */
export async function persistJobs(jobs: NormalizedJob[], opts: { importedById?: string } = {}) {
  const now = new Date();
  const unique = [...new Map(jobs.map((j) => [jobId(j), j])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    const ids = chunk.map(jobId);
    const existing = new Map(
      (await db.job.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, location: true, description: true, descriptionFull: true, salaryMin: true, salaryMax: true, url: true } })).map((r) => [r.id, r]),
    );
    const toCreate = [];
    const toUpdate = [];
    const unchanged: string[] = [];
    for (const { summaryOnly, ...j } of chunk) {
      const id = jobId(j);
      const data = { ...j, salaryYearlyUsd: normalizeSalaryYearlyUsd(j), ...geoFields(j.location), fetchedAt: now, lastSeenAt: now, importedById: opts.importedById ?? null };
      const old = existing.get(id);
      if (!old) {
        toCreate.push({ id, ...data, descriptionFull: !summaryOnly });
        continue;
      }
      // Keep the first posting date we recorded (aggregators re-date old jobs) and
      // never replace a complete description with a feed snippet.
      const { postedAt: _keepDate, description, ...rest } = data;
      void _keepDate;
      const newText = !summaryOnly && description !== old.description && description.length >= Math.min(old.description.length, 400);
      const changed = newText || old.title !== j.title || old.location !== j.location || old.url !== j.url || old.salaryMin !== j.salaryMin || old.salaryMax !== j.salaryMax;
      if (changed) toUpdate.push({ id, data: { ...rest, ...(newText ? { description, descriptionFull: true } : {}) } });
      else unchanged.push(id);
    }
    if (toCreate.length) await db.job.createMany({ data: toCreate, skipDuplicates: true });
    if (unchanged.length) await db.job.updateMany({ where: { id: { in: unchanged } }, data: { fetchedAt: now, lastSeenAt: now } });
    for (let k = 0; k < toUpdate.length; k += 50)
      await db.$transaction(toUpdate.slice(k, k + 50).map((u) => db.job.update({ where: { id: u.id }, data: u.data })));
  }
  if (embeddingsEnabled()) await embedMissing(unique.map(jobId)).catch((e) => log.warn("embed.failed", { message: String(e) }));
}

/** Fill country/city for rows saved before location detection existed. */
export async function backfillGeo(limit = 5000) {
  const rows = await db.job.findMany({ where: { country: null, remoteScope: null, location: { not: "" } }, select: { id: true, location: true }, take: limit });
  const updates = rows.map((r) => ({ id: r.id, ...geoFields(r.location) })).filter((u) => u.country || u.remoteScope);
  for (let i = 0; i < updates.length; i += 200) {
    await db.$transaction(updates.slice(i, i + 200).map(({ id, ...data }) => db.job.update({ where: { id }, data })));
  }
  return updates.length;
}

async function embedMissing(ids: string[]) {
  const rows = await db.job.findMany({ where: { id: { in: ids }, embedding: null }, select: { id: true, title: true, description: true } });
  for (let i = 0; i < rows.length; i += 64) {
    const batch = rows.slice(i, i + 64);
    const vectors = await embedTexts(batch.map(jobEmbeddingText), "document");
    await db.$transaction(batch.map((r, k) => db.job.update({ where: { id: r.id }, data: { embedding: JSON.stringify(vectors[k]) } })));
  }
}

/** Distinct target roles across users - keywords for query-based APIs. */
async function popularRoles(limit = 5) {
  const prefs = await db.preferences.findMany({ select: { data: true }, take: 500, orderBy: { updatedAt: "desc" } });
  const counts = new Map<string, number>();
  for (const p of prefs) {
    try {
      for (const r of (JSON.parse(p.data).roles ?? []) as string[]) counts.set(r.toLowerCase(), (counts.get(r.toLowerCase()) ?? 0) + 1);
    } catch {
      /* skip malformed */
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([r]) => r);
}

/** Countries to ingest for country-aware sources: env defaults + users' picks. */
async function targetCountries(src: SourceDefinition): Promise<(string | undefined)[]> {
  if (!src.countries) return [undefined];
  const fromEnv = csvEnv(src.countriesEnv ?? "").map((c) => c.toUpperCase());
  const prefs = await db.preferences.findMany({ select: { data: true }, take: 500, orderBy: { updatedAt: "desc" } });
  const fromUsers = prefs.flatMap((p) => {
    try {
      return ((JSON.parse(p.data).locations ?? []) as string[]).flatMap((l) => detectLocation(l).countries);
    } catch {
      return [];
    }
  });
  const wanted = [...new Set([...fromEnv, ...fromUsers])].filter((c) => src.countries!.includes(c));
  return wanted.length ? wanted.slice(0, 4) : [src.countries[0]];
}

async function runSource(src: SourceDefinition, ctx: { boards: string[] }, keywordSets: string[][]) {
  const started = Date.now();
  try {
    if (!(await rateLimit(`source:${src.id}`, src.requestsPerMinute, 60_000)).ok) throw new Error("Rate limit reached; will retry next cycle.");
    const sets = src.queryIndependent ? [[]] : keywordSets.length ? keywordSets : [["software engineer"]];
    const countries = await targetCountries(src);
    const all: NormalizedJob[] = [];
    const warnings: string[] = [];
    for (const country of countries)
      for (const keywords of sets.slice(0, Math.max(1, Math.floor(8 / countries.length)))) {
        const got: BoardJobs = await src.fetchJobs({ keywords, country, maxDaysOld: MAX_LISTING_AGE_DAYS, titleOnly: keywords.length > 0 }, AbortSignal.timeout(30_000), ctx);
        all.push(...got);
        warnings.push(...(got.warnings ?? []));
      }
    await persistJobs(all);
    // A run that worked but had broken or empty boards is saved as ok with a note: the admin page shows it as degraded.
    const note = warnings.length ? `Partly working: ${warnings.slice(0, 4).join("; ")}${warnings.length > 4 ? ` (+${warnings.length - 4} more)` : ""}` : all.length === 0 && src.boardsEnv ? "No current listings on any configured board." : null;
    await db.sourceRun.create({ data: { source: src.id, durationMs: Date.now() - started, ok: true, count: all.length, error: note?.slice(0, 300) ?? null } });
    return { id: src.id, ok: true, count: all.length, ...(note ? { error: note } : {}) };
  } catch (err) {
    const error = err instanceof Error ? (err.name === "TimeoutError" ? "Timed out" : err.message) : "Unknown error";
    await db.sourceRun.create({ data: { source: src.id, durationMs: Date.now() - started, ok: false, count: 0, error: error.slice(0, 300) } });
    log.warn("ingest.source_failed", { source: src.id, error });
    return { id: src.id, ok: false, count: 0, error };
  }
}

/** Default time budget for one refresh: serverless requests stop at 60s. */
export const REFRESH_BUDGET_MS = 40_000;
/** Sources fetched at the same time (they compete for the same database). */
const REFRESH_CONCURRENCY = 5;
/** Assumed run time for a source that has never run. */
const FIRST_RUN_ESTIMATE_MS = 20_000;

/**
 * Refresh active sources whose cache window has expired (or all, with force),
 * least recently refreshed first, a few at a time. A source only starts if its
 * last run time still fits in the budget; the rest are left for the next call,
 * so each call stays inside a serverless time limit and every source still
 * gets its turn. Concurrent callers share one run.
 */
export function refreshSources(opts: { force?: boolean; onlyIds?: string[]; extraKeywords?: string[]; budgetMs?: number } = {}): Promise<IngestReport> {
  if (running) return running;
  running = (async () => {
    const deadline = Date.now() + (opts.budgetMs ?? REFRESH_BUDGET_MS);
    await backfillGeo().catch((e) => log.warn("geo.backfill_failed", { message: String(e) }));
    // On-demand sources (Jooble) only run when a user searches.
    const sources = (await activeSources()).filter((s) => !s.def.onDemandOnly && (!opts.onlyIds || opts.onlyIds.includes(s.def.id)));
    const roles = await popularRoles();
    const keywordSets = [...new Set([...(opts.extraKeywords ?? []), ...roles])].slice(0, 6).map((k) => [k]);
    const ran: IngestReport["ran"] = [];
    const due = (
      await Promise.all(
        sources.map(async (s) => {
          const last = await db.sourceRun.findFirst({ where: { source: s.def.id, ok: true }, orderBy: { startedAt: "desc" } });
          const ttl = s.def.cacheTtlMs || 60 * 60_000;
          if (!opts.force && last && Date.now() - last.startedAt.getTime() < ttl) {
            ran.push({ id: s.def.id, ok: true, count: 0, skipped: "fresh" });
            return null;
          }
          return { ...s, lastAt: last?.startedAt.getTime() ?? 0, estimate: last?.durationMs ?? FIRST_RUN_ESTIMATE_MS };
        }),
      )
    )
      .filter((s) => s !== null)
      .sort((a, b) => a.lastAt - b.lastAt);
    let next = 0;
    let started = 0;
    await Promise.all(
      Array.from({ length: REFRESH_CONCURRENCY }, async () => {
        while (next < due.length) {
          const { def, ctx, estimate } = due[next++];
          // The most overdue source always starts (a slow source would otherwise be deferred forever);
          // its own fetch timeout keeps it inside the request limit.
          if (started > 0 && Date.now() + estimate > deadline) ran.push({ id: def.id, ok: true, count: 0, skipped: "deferred" });
          else {
            started++;
            ran.push(await runSource(def, ctx, keywordSets));
          }
        }
      }),
    );
    log.info("ingest.done", { ran: ran.map((r) => `${r.id}:${r.skipped ?? (r.ok ? r.count : "err")}`).join(",") });
    return { ran };
  })().finally(() => {
    running = null;
  });
  return running;
}

const onDemandSeen = new Map<string, number>();

/** Count one request against a lifetime-capped key; false once the cap is hit. */
async function takeQuota(sourceId: string, cap: number) {
  const s = await db.sourceSetting.upsert({ where: { id: sourceId }, create: { id: sourceId }, update: {} });
  if (s.requestsUsed >= cap) {
    log.warn("source.quota_exhausted", { source: sourceId, used: s.requestsUsed, cap });
    return false;
  }
  await db.sourceSetting.update({ where: { id: sourceId }, data: { requestsUsed: { increment: 1 } } });
  return true;
}

/**
 * When a user searches a specific country, also ask country-aware sources
 * (e.g. Adzuna India) for that query. Each source/country/query combination
 * is fetched at most once per 30 minutes and still obeys the source limit.
 */
export async function fetchForCountry(country: string, keywords: string[], client?: { ip: string; userAgent: string }, maxDaysOld = MAX_LISTING_AGE_DAYS, titleOnly = false, city?: string) {
  const sources = (await activeSources()).filter((s) => s.def.countries?.includes(country) || (s.def.keywordSearch && keywords.length));
  const base = keywords.length ? keywords.slice(0, 3) : (await popularRoles(1)).slice(0, 1);
  if (base.length === 0) return;
  // Ask for the related titles as well ("procurement" -> purchasing, sourcing), a few at most.
  const sets = titleOnly ? expandTitleTerms(base).slice(0, 4).map((t) => [t]) : [base];
  await Promise.all(
    sources.flatMap(({ def, ctx }) => (def.lifetimeQuota ? sets.slice(0, 1) : sets).map((kw) => ({ def, ctx, kw }))).map(async ({ def, ctx, kw }) => {
      const key = `${def.id}|${country}|${city ?? ""}|${kw.join("+").toLowerCase()}|${maxDaysOld}d|${titleOnly ? "title" : "any"}`;
      // Quota-limited keys (Jooble) reuse results for their whole cache window.
      const window = def.lifetimeQuota ? def.cacheTtlMs : 30 * 60_000;
      if (Date.now() - (onDemandSeen.get(key) ?? 0) < window) return;
      if (def.lifetimeQuota && !(await takeQuota(def.id, def.lifetimeQuota))) return;
      onDemandSeen.set(key, Date.now());
      if (!(await rateLimit(`source:${def.id}`, def.requestsPerMinute, 60_000)).ok) return;
      const started = Date.now();
      try {
        const jobs = await def.fetchJobs({ keywords: kw, country, location: city, client, maxDaysOld, titleOnly }, AbortSignal.timeout(20_000), ctx);
        await persistJobs(jobs);
        await db.sourceRun.create({ data: { source: def.id, durationMs: Date.now() - started, ok: true, count: jobs.length } });
      } catch (err) {
        onDemandSeen.delete(key);
        const error = err instanceof Error ? err.message : "Unknown error";
        await db.sourceRun.create({ data: { source: def.id, durationMs: Date.now() - started, ok: false, count: 0, error: error.slice(0, 300) } });
      }
    }),
  );
}

/** Retention: purge stale listings, demo accounts and expired tokens. */
export async function cleanup() {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86_400_000);
  const [jobs, demos, sessions, tokens, runs, outbox] = await Promise.all([
    db.job.deleteMany({ where: { importedById: null, lastSeenAt: { lt: days(30) }, states: { none: {} }, generations: { none: {} } } }),
    db.user.deleteMany({ where: { isDemo: true, createdAt: { lt: days(1) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    db.passwordResetToken.deleteMany({ where: { expiresAt: { lt: days(1) } } }),
    db.sourceRun.deleteMany({ where: { startedAt: { lt: days(14) } } }),
    db.outboxEmail.deleteMany({ where: { createdAt: { lt: days(7) } } }),
  ]);
  const report = { jobs: jobs.count, demoUsers: demos.count, sessions: sessions.count, tokens: tokens.count, runs: runs.count, outbox: outbox.count };
  log.info("cleanup.done", report);
  return report;
}
