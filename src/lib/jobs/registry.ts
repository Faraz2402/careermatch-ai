import "server-only";
// The compliance-friendly source configuration layer. To add a provider,
// implement SourceDefinition in ./sources and register it here. A source runs
// only when enabled (admin override, else JOB_SOURCES_ENABLED) *and* fully
// configured. Secrets (API keys) always stay in environment variables.

import { db } from "../db";
import { arbeitnow } from "./sources/arbeitnow";
import { demo } from "./sources/demo";
import { oracle, smartrecruiters, successfactors, workable } from "./sources/ats-boards";
import { ashby, greenhouse, lever } from "./sources/employer-boards";
import { jooble } from "./sources/jooble";
import { adzuna } from "./sources/keyed-apis";
import { REMOTE_BOARDS } from "./sources/remote-boards";
import { remotive } from "./sources/remotive";
import type { SourceContext, SourceDefinition } from "./types";
import { csvEnv } from "./util";

export const ALL_SOURCES: SourceDefinition[] = [demo, remotive, arbeitnow, ...REMOTE_BOARDS, greenhouse, lever, ashby, smartrecruiters, workable, successfactors, oracle, adzuna, jooble];

/** Listings the user imported from a URL or pasted in. */
export const USER_LINK_SOURCE = {
  id: "user_link",
  name: "Imported by you",
  attribution: "Added by you from a job link or pasted description.",
} as const;

const DEFAULT_ENABLED = "demo,remotive,arbeitnow,remoteok,weworkremotely,jobicy,himalayas,workingnomads,realworkfromanywhere,greenhouse,lever,ashby,smartrecruiters,workable,successfactors,oracle,adzuna,jooble";

function envEnabled(): Set<string> {
  return new Set(csvEnv("JOB_SOURCES_ENABLED").length ? csvEnv("JOB_SOURCES_ENABLED") : DEFAULT_ENABLED.split(","));
}

type Resolved = { def: SourceDefinition; enabled: boolean; ctx: SourceContext; reason: string | null; overridden: boolean; requestsUsed: number };

let memo: { at: number; value: Resolved[] } | null = null;

export async function resolveSources(fresh = false): Promise<Resolved[]> {
  if (!fresh && memo && Date.now() - memo.at < 15_000) return memo.value;
  const settings = new Map((await db.sourceSetting.findMany()).map((s) => [s.id, s]));
  const env = envEnabled();
  const value = ALL_SOURCES.map((def) => {
    const s = settings.get(def.id);
    const boards = s?.boards != null ? s.boards.split(",").map((b) => b.trim()).filter(Boolean) : def.boardsEnv ? csvEnv(def.boardsEnv) : [];
    const ctx = { boards };
    const enabled = s?.enabled ?? env.has(def.id);
    const missing = def.missingConfig(ctx);
    return { def, enabled, ctx, overridden: s?.enabled != null, requestsUsed: s?.requestsUsed ?? 0, reason: !enabled ? "Disabled by the operator." : missing };
  });
  memo = { at: Date.now(), value };
  return value;
}

export function invalidateSourceCache() {
  memo = null;
}

export async function activeSources() {
  return (await resolveSources()).filter((r) => r.enabled && r.reason === null);
}

export function sourceMeta(id: string): { name: string; attribution: string; kind: string } {
  if (id === USER_LINK_SOURCE.id) return { ...USER_LINK_SOURCE, kind: "user_link" };
  const s = ALL_SOURCES.find((x) => x.id === id);
  return s ? { name: s.name, attribution: s.attribution, kind: s.kind } : { name: id, attribution: "", kind: "unknown" };
}

export type SourceHealth = {
  id: string;
  name: string;
  kind: string;
  homepage: string;
  termsUrl?: string;
  attribution: string;
  enabled: boolean;
  overridden: boolean;
  configured: boolean;
  reason: string | null;
  boards: string[];
  usesBoards: boolean;
  cacheMinutes: number;
  requestsPerMinute: number;
  lastRun: { at: string; ok: boolean; count: number; durationMs: number; error: string | null } | null;
  lastSuccessAt: string | null;
  successRate: number | null; // last 7 days
  listings: number;
  onDemandOnly: boolean;
  quota: { used: number; cap: number } | null;
};

export async function sourceHealth(): Promise<SourceHealth[]> {
  const resolved = await resolveSources(true);
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [runs, counts] = await Promise.all([
    db.sourceRun.findMany({ where: { startedAt: { gte: since } }, orderBy: { startedAt: "desc" } }),
    db.job.groupBy({ by: ["source"], _count: true, where: { lastSeenAt: { gte: since } } }),
  ]);
  return resolved.map(({ def, enabled, ctx, reason, overridden, requestsUsed }) => {
    const mine = runs.filter((r) => r.source === def.id);
    const last = mine[0];
    const lastOk = mine.find((r) => r.ok);
    return {
      id: def.id,
      name: def.name,
      kind: def.kind,
      homepage: def.homepage,
      termsUrl: def.termsUrl,
      attribution: def.attribution,
      enabled,
      overridden,
      configured: def.missingConfig(ctx) === null,
      reason,
      boards: ctx.boards,
      usesBoards: !!def.boardsEnv,
      cacheMinutes: Math.round(def.cacheTtlMs / 60000),
      requestsPerMinute: def.requestsPerMinute,
      lastRun: last ? { at: last.startedAt.toISOString(), ok: last.ok, count: last.count, durationMs: last.durationMs, error: last.error } : null,
      lastSuccessAt: lastOk?.startedAt.toISOString() ?? null,
      successRate: mine.length ? Math.round((100 * mine.filter((r) => r.ok).length) / mine.length) : null,
      listings: counts.find((c) => c.source === def.id)?._count ?? 0,
      onDemandOnly: !!def.onDemandOnly,
      quota: def.lifetimeQuota ? { used: requestsUsed, cap: def.lifetimeQuota } : null,
    };
  });
}
