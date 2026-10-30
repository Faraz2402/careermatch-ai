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
import type { NormalizedJob, SourceDefinition } from "./types";
import { csvEnv } from "./util";

export const jobId = (j: Pick<NormalizedJob, "source" | "externalId">) => `${j.source}:${j.externalId}`;

let running: Promise<IngestReport> | null = null;

export type IngestReport = { ran: { id: string; ok: boolean; count: number; error?: string; skipped?: string }[] };

export async function persistJobs(jobs: NormalizedJob[], opts: { importedById?: string } = {}) {
  const now = new Date();
  for (let i = 0; i < jobs.length; i += 100) {
    const chunk = jobs.slice(i, i + 100);
    await db.$transaction(
      chunk.map((j) => {
        const data = {
          ...j,
          salaryYearlyUsd: normalizeSalaryYearlyUsd(j),
          ...geoFields(j.location),
          fetchedAt: now,
          lastSeenAt: now,
          importedById: opts.importedById ?? null,
        };
        return db.job.upsert({ where: { id: jobId(j) }, create: { id: jobId(j), ...data }, update: data });
      }),
    );
  }
  if (embeddingsEnabled()) await embedMissing(jobs.map(jobId)).catch((e) => log.warn("embed.failed", { message: String(e) }));
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
    for (const country of countries)
      for (const keywords of sets.slice(0, Math.max(1, Math.floor(8 / countries.length))))
        all.push(...(await src.fetchJobs({ keywords, country }, AbortSignal.timeout(30_000), ctx)));
    await persistJobs(all);
    await db.sourceRun.create({ data: { source: src.id, durationMs: Date.now() - started, ok: true, count: all.length } });
    return { id: src.id, ok: true, count: all.length };
  } catch (err) {
    const error = err instanceof Error ? (err.name === "TimeoutError" ? "Timed out" : err.message) : "Unknown error";
    await db.sourceRun.create({ data: { source: src.id, durationMs: Date.now() - started, ok: false, count: 0, error: error.slice(0, 300) } });
    log.warn("ingest.source_failed", { source: src.id, error });
    return { id: src.id, ok: false, count: 0, error };
  }
}

/**
 * Refresh every active source whose cache window has expired (or all, with
 * force). Concurrent callers share one run.
 */
export function refreshSources(opts: { force?: boolean; onlyIds?: string[]; extraKeywords?: string[] } = {}): Promise<IngestReport> {
  if (running) return running;
  running = (async () => {
    await backfillGeo().catch((e) => log.warn("geo.backfill_failed", { message: String(e) }));
    const sources = (await activeSources()).filter((s) => !opts.onlyIds || opts.onlyIds.includes(s.def.id));
    const roles = await popularRoles();
    const keywordSets = [...new Set([...(opts.extraKeywords ?? []), ...roles])].slice(0, 6).map((k) => [k]);
    const ran = await Promise.all(
      sources.map(async ({ def, ctx }) => {
        if (!opts.force) {
          const last = await db.sourceRun.findFirst({ where: { source: def.id, ok: true }, orderBy: { startedAt: "desc" } });
          const ttl = def.cacheTtlMs || 60 * 60_000;
          if (last && Date.now() - last.startedAt.getTime() < ttl) return { id: def.id, ok: true, count: 0, skipped: "fresh" };
        }
        return runSource(def, ctx, keywordSets);
      }),
    );
    log.info("ingest.done", { ran: ran.map((r) => `${r.id}:${"skipped" in r && r.skipped ? "fresh" : r.ok ? r.count : "err"}`).join(",") });
    return { ran };
  })().finally(() => {
    running = null;
  });
  return running;
}

const onDemandSeen = new Map<string, number>();

/**
 * When a user searches a specific country, also ask country-aware sources
 * (e.g. Adzuna India) for that query. Each source/country/query combination
 * is fetched at most once per 30 minutes and still obeys the source limit.
 */
export async function fetchForCountry(country: string, keywords: string[]) {
  const sources = (await activeSources()).filter((s) => s.def.countries?.includes(country));
  const kw = keywords.length ? keywords.slice(0, 3) : (await popularRoles(1)).slice(0, 1);
  await Promise.all(
    sources.map(async ({ def, ctx }) => {
      const key = `${def.id}|${country}|${kw.join("+").toLowerCase()}`;
      if (Date.now() - (onDemandSeen.get(key) ?? 0) < 30 * 60_000) return;
      onDemandSeen.set(key, Date.now());
      if (!(await rateLimit(`source:${def.id}`, def.requestsPerMinute, 60_000)).ok) return;
      const started = Date.now();
      try {
        const jobs = await def.fetchJobs({ keywords: kw, country }, AbortSignal.timeout(20_000), ctx);
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
