import "server-only";
// The background description task. Several feeds only return a snippet of
// each job (Adzuna and Jooble always; Workday, SmartRecruiters and Oracle for
// listings beyond the first few per run). This task replaces every snippet
// with the complete posting, so the page shows the whole description and the
// match score is computed from the whole description.
//
// It runs: every few minutes from /api/cron/hydrate (GitHub Actions schedule),
// after searches (Next.js `after`), when a signed-in user's tab goes to the
// background (/api/jobs/hydrate), and on demand when someone opens a job.

import type { Job } from "@prisma/client";
import { aiEnabled } from "../ai";
import { db } from "../db";
import { log } from "../log";
import { enrichJob, extractRequirements, readEnrichment, type JobEnrichment } from "./enrich";
import { importJobFromUrl } from "./import-url";
import { SNIPPET_SOURCES } from "./registry";
import { fetchOracleDetail, fetchWorkdayDetail, mapSmartRecruiters, oracleDescription, workdayDetailFields, workdayHost } from "./sources/ats-boards";
import { fetchJson } from "./util";
import { webSearchEnabled } from "../ai";
import { tavilyEnabled } from "../tavily";
import { geoFields } from "../geo/detect";

/** Attempts per listing before we stop trying (spaced at least an hour apart). */
const MAX_TRIES = 3;
const RETRY_AFTER_MS = 60 * 60_000;
/** A real posting is rarely this short; shorter text is treated as a snippet. */
const MIN_FULL_LENGTH = 300;

type Full = { description: string; location?: string; postedAt?: Date | null };

const longer = (text: string | null | undefined, than: string) => (text && text.trim().length >= MIN_FULL_LENGTH && text.length > than.length * 0.9 ? text.trim() : null);

/** Read the complete posting for one listing from where the source publishes it. */
async function loadFull(row: Job, signal: AbortSignal): Promise<Full | null> {
  switch (row.source) {
    case "workday": {
      // https://{tenant}.wdN.myworkdayjobs.com/{site}/job/...
      const u = new URL(row.url);
      const [, site, ...rest] = u.pathname.split("/");
      const { host, tenant } = workdayHost(u.hostname);
      const d = workdayDetailFields(await fetchWorkdayDetail(host, tenant, site, `/${rest.join("/")}`, signal));
      const description = longer(d.description, row.description);
      return description ? { description, location: d.location || undefined, postedAt: d.postedAt } : null;
    }
    case "smartrecruiters": {
      const cut = row.externalId.lastIndexOf("-");
      const company = row.externalId.slice(0, cut);
      const id = row.externalId.slice(cut + 1);
      const detail = await fetchJson<Parameters<typeof mapSmartRecruiters>[1] & Parameters<typeof mapSmartRecruiters>[0]>(
        `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings/${encodeURIComponent(id)}`,
        signal,
      );
      const mapped = mapSmartRecruiters(detail, detail);
      return mapped.summaryOnly ? null : (longer(mapped.description, row.description) ? { description: mapped.description } : null);
    }
    case "oracle": {
      // https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{id}
      const u = new URL(row.url);
      const m = u.pathname.match(/\/sites\/([^/]+)\/job\/([^/]+)/);
      if (!m) return null;
      const d = await fetchOracleDetail(u.hostname, decodeURIComponent(m[1]), decodeURIComponent(m[2]), signal);
      const description = d ? longer(oracleDescription(d), row.description) : null;
      return description ? { description } : null;
    }
    default: {
      if (SNIPPET_SOURCES.has(row.source)) {
        // The aggregator's page is off limits; find the employer's own posting instead.
        if (!webSearchEnabled() && !tavilyEnabled()) return null;
        const e = await enrichJob(row, true);
        const description = longer(e.fullDescription, row.description);
        return description ? { description } : null;
      }
      if (!row.url) return null;
      const p = await importJobFromUrl(row.url);
      const description = longer(p.description, row.description);
      return description ? { description, postedAt: p.postedAt } : null;
    }
  }
}

/** Store the complete description, and re-read the requirements from it. */
async function saveFull(row: Job, full: Full, opts: { readRequirements: boolean }) {
  // Re-read: the enrichment step (aggregator jobs) may have just saved newer data.
  const current = await db.job.findUnique({ where: { id: row.id }, select: { enrichment: true } });
  const e = current ? readEnrichment(current) : null;
  let enrichment: JobEnrichment | null = e;
  // Requirements read from a snippet are incomplete: read them again from the whole text.
  if (!e?.requirementsFromFull) {
    const requirements = opts.readRequirements && aiEnabled() ? await extractRequirements(row, full.description).catch(() => null) : null;
    enrichment = e
      ? { ...e, requirements: requirements ?? null, requirementsFromFull: !!requirements }
      : requirements
        ? { applyUrl: null, careersUrl: null, fullDescription: null, descriptionFrom: null, requirements, requirementsFromFull: true, market: null, notes: [] }
        : null;
  }
  const location = full.location && full.location !== row.location ? { location: full.location, ...geoFields(full.location) } : {};
  const postedAt = full.postedAt && (!row.postedAt || full.postedAt < row.postedAt) ? { postedAt: full.postedAt } : {};
  return db.job.update({
    where: { id: row.id },
    data: {
      description: full.description,
      descriptionFull: true,
      descriptionCheckedAt: new Date(),
      enrichment: enrichment ? JSON.stringify(enrichment) : null,
      ...location,
      ...postedAt,
    },
  });
}

async function markTried(row: Job, error?: string) {
  await db.job.update({ where: { id: row.id }, data: { descriptionCheckedAt: new Date(), descriptionTries: { increment: 1 } } });
  if (error) log.warn("hydrate.failed", { job: row.id, source: row.source, error: error.slice(0, 200) });
}

/** Load one listing's complete description now (used when someone opens the job). */
export async function ensureFullDescription(row: Job, timeoutMs = 12_000): Promise<Job> {
  if (row.descriptionFull || row.source === "demo" || row.importedById) return row;
  if (row.descriptionTries >= MAX_TRIES + 2) return row; // keep trying a little longer for jobs people actually open
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const full = await Promise.race([
      loadFull(row, signal),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (full) return await saveFull(row, full, { readRequirements: true });
    await markTried(row);
  } catch (e) {
    await markTried(row, String(e)).catch(() => undefined);
  }
  return row;
}

export type HydrateReport = { checked: number; completed: number; failed: number; remaining: number; ms: number };

let running: Promise<HydrateReport> | null = null;

/**
 * Upgrade the newest snippet-only listings to their complete description,
 * a few at a time, within a time budget. Concurrent callers share one run.
 */
export function hydrateDescriptions(opts: { budgetMs?: number; limit?: number } = {}): Promise<HydrateReport> {
  if (running) return running;
  running = (async () => {
    const started = Date.now();
    const deadline = started + (opts.budgetMs ?? 40_000);
    const where = {
      descriptionFull: false,
      expiredAt: null,
      importedById: null,
      source: { not: "demo" },
      lastSeenAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
      descriptionTries: { lt: MAX_TRIES },
      OR: [{ descriptionCheckedAt: null }, { descriptionCheckedAt: { lt: new Date(Date.now() - RETRY_AFTER_MS) } }],
    };
    const limit = opts.limit ?? 60;
    // Employer APIs are cheap and unmetered; searches for aggregator jobs use a daily quota, so only a few per run.
    const [direct, viaSearch] = await Promise.all([
      db.job.findMany({ where: { ...where, source: { notIn: ["demo", ...SNIPPET_SOURCES] } }, orderBy: { firstSeenAt: "desc" }, take: limit }),
      db.job.findMany({ where: { ...where, source: { in: [...SNIPPET_SOURCES] } }, orderBy: { firstSeenAt: "desc" }, take: 4 }),
    ]);
    const queue = [...direct, ...viaSearch];
    let completed = 0, failed = 0, checked = 0, aiReads = 0;
    let next = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < queue.length && Date.now() < deadline - 3_000) {
          const row = queue[next++];
          // Aggregator jobs need a web search plus page reads (slow): only start one with plenty of time left.
          if (SNIPPET_SOURCES.has(row.source) && deadline - Date.now() < 25_000) continue;
          checked++;
          try {
            const ms = Math.min(20_000, Math.max(3_000, deadline - Date.now()));
            // Hard stop per listing, even for steps that don't take an abort signal.
            const full = await Promise.race([loadFull(row, AbortSignal.timeout(ms)), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms + 1_000))]);
            if (full) {
              // AI requirement reads are rate-limited by the provider; the rest use keyword matching on the full text until opened.
              await saveFull(row, full, { readRequirements: aiReads++ < 8 });
              completed++;
            } else {
              await markTried(row);
              failed++;
            }
          } catch (e) {
            await markTried(row, String(e)).catch(() => undefined);
            failed++;
          }
        }
      }),
    );
    const remaining = await db.job.count({ where });
    const report = { checked, completed, failed, remaining, ms: Date.now() - started };
    log.info("hydrate.done", report);
    return report;
  })().finally(() => {
    running = null;
  });
  return running;
}
