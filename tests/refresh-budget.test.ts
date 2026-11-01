import { beforeEach, describe, expect, it, vi } from "vitest";

const MIN = 60_000;
const lastRuns: Record<string, { startedAt: Date; durationMs: number } | null> = {};
const fetched: string[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    job: { findMany: vi.fn(async () => []) },
    preferences: { findMany: vi.fn(async () => []) },
    sourceRun: {
      findFirst: vi.fn(async ({ where }: { where: { source: string } }) => lastRuns[where.source] ?? null),
      create: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async () => []),
  },
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/jobs/embeddings", () => ({ embeddingsEnabled: () => false, embedTexts: vi.fn(), jobEmbeddingText: vi.fn() }));

const source = (id: string, cacheTtlMs = 60 * MIN) => ({
  def: { id, name: id, kind: "employer_feed", homepage: "", attribution: "", cacheTtlMs, requestsPerMinute: 30, queryIndependent: true, missingConfig: () => null, fetchJobs: vi.fn(async () => (fetched.push(id), [])) },
  ctx: { boards: [] },
  enabled: true,
  reason: null,
});
let sources: ReturnType<typeof source>[] = [];
vi.mock("@/lib/jobs/registry", () => ({ activeSources: vi.fn(async () => sources) }));

const { refreshSources } = await import("@/lib/jobs/ingest");

beforeEach(() => {
  fetched.length = 0;
  for (const k of Object.keys(lastRuns)) delete lastRuns[k];
});

describe("refreshSources budget", () => {
  it("runs due sources oldest first and defers what can't fit", async () => {
    sources = [source("fresh"), source("slow"), source("never"), source("quick")];
    lastRuns.fresh = { startedAt: new Date(Date.now() - 5 * MIN), durationMs: 1_000 }; // inside its cache window
    lastRuns.slow = { startedAt: new Date(Date.now() - 3 * 60 * MIN), durationMs: 50_000 }; // longer than the budget
    lastRuns.quick = { startedAt: new Date(Date.now() - 2 * 60 * MIN), durationMs: 2_000 };
    const { ran } = await refreshSources({ budgetMs: 30_000 });
    const by = Object.fromEntries(ran.map((r) => [r.id, r.skipped ?? "ran"]));
    expect(by).toEqual({ fresh: "fresh", never: "ran", slow: "deferred", quick: "ran" });
    expect(fetched).toEqual(["never", "quick"]);
  });

  it("force ignores cache windows but still keeps to the budget", async () => {
    sources = [source("a"), source("b")];
    lastRuns.a = { startedAt: new Date(), durationMs: 1_000 };
    lastRuns.b = { startedAt: new Date(), durationMs: 90_000 };
    const { ran } = await refreshSources({ force: true, budgetMs: 40_000 });
    expect(Object.fromEntries(ran.map((r) => [r.id, r.skipped ?? "ran"]))).toEqual({ a: "ran", b: "deferred" });
  });
});
