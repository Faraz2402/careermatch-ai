import "server-only";
import { db } from "./db";

// Free gives away what is cheap and builds the habit (feed, scores, skills,
// tracker, public profile) and meters what costs us money or carries the
// most value (AI, downloads, web-search job analyses). null = unlimited.
export const PLANS = {
  free: {
    name: "Free",
    aiActionsPerMonth: 5,
    savedSearches: 1,
    resumeVersions: 1,
    /** Distinct documents that can ever be downloaded as PDF/Word. */
    resumeExports: 1,
    coverLetterExports: 1,
    /** Original posting + full description + market salary (uses web search). */
    jobAnalysesPerMonth: 3,
    dailyEmail: false,
    /** Studio: tailored applications (résumé + cover letter for one job). */
    tailorDrafts: 1,
    premiumTemplates: false,
  },
  pro: {
    name: "Pro",
    aiActionsPerMonth: 400,
    savedSearches: 20,
    resumeVersions: 20,
    resumeExports: null,
    coverLetterExports: null,
    jobAnalysesPerMonth: null,
    dailyEmail: true,
    tailorDrafts: null,
    premiumTemplates: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;
type PlanUser = { id: string; plan: string; planRenewsAt?: Date | null };

/** Pro is prepaid: it counts only until the paid period ends. */
export const planOf = (u: { plan: string; planRenewsAt?: Date | string | null }): PlanId =>
  u.plan === "pro" && (!u.planRenewsAt || new Date(u.planRenewsAt) > new Date()) ? "pro" : "free";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

// Exports and analyses are logged as usage events too, but don't count toward AI actions.
const METERED = ["export:", "analysis:"];

export async function usageThisMonth(userId: string) {
  return db.usageEvent.count({ where: { userId, createdAt: { gte: monthStart() }, NOT: METERED.map((p) => ({ kind: { startsWith: p } })) } });
}

// --- Exports: one of each document type on Free, re-downloads always free ----

export type ExportKind = "resume" | "cover_letter";
const exportPrefix = (k: ExportKind) => `export:${k}:`;
const exportLimit = (user: PlanUser, k: ExportKind) => (k === "resume" ? PLANS[planOf(user)].resumeExports : PLANS[planOf(user)].coverLetterExports);

async function exportedIds(userId: string, k: ExportKind) {
  const rows = await db.usageEvent.findMany({ where: { userId, kind: { startsWith: exportPrefix(k) } }, select: { kind: true }, distinct: ["kind"] });
  return rows.map((r) => r.kind);
}

/** May this user download this document? Records the first download of each. */
export async function claimExport(user: PlanUser, k: ExportKind, generationId: string) {
  const kind = `${exportPrefix(k)}${generationId}`;
  const done = await exportedIds(user.id, k);
  if (done.includes(kind)) return true;
  const limit = exportLimit(user, k);
  if (limit !== null && done.length >= limit) return false;
  await db.usageEvent.create({ data: { userId: user.id, kind } });
  return true;
}

/** Note shown next to the export buttons, or undefined when unlimited. */
export async function exportNote(user: PlanUser, k: ExportKind) {
  const limit = exportLimit(user, k);
  if (limit === null) return undefined;
  const label = k === "resume" ? "tailored résumé" : "cover letter";
  return (await exportedIds(user.id, k)).length >= limit
    ? `You've used your free ${label} export (re-downloading it is still free).`
    : `Free plan: you can export ${limit} ${label} to PDF/Word.`;
}

// --- Job analyses (web search): metered per month on Free -----------------------

const ANALYSIS = "analysis:";

/** May this user run a new job analysis? Re-opening an analysed job is free. */
export async function claimJobAnalysis(user: PlanUser, jobId: string) {
  const limit = PLANS[planOf(user)].jobAnalysesPerMonth;
  const kind = `${ANALYSIS}${jobId}`;
  const done = await db.usageEvent.findMany({ where: { userId: user.id, kind: { startsWith: ANALYSIS }, createdAt: { gte: monthStart() } }, select: { kind: true } });
  if (done.some((e) => e.kind === kind)) return { ok: true as const };
  if (limit !== null && done.length >= limit)
    return { ok: false as const, message: `The Free plan includes ${limit} job analyses a month (employer apply links, full description and market salary). Upgrade to Pro for unlimited analyses.` };
  await db.usageEvent.create({ data: { userId: user.id, kind } });
  return { ok: true as const };
}

/** Checks the monthly AI quota and records one action when allowed. */
export async function consumeAiAction(user: PlanUser, kind: string) {
  const plan = PLANS[planOf(user)];
  const used = await usageThisMonth(user.id);
  if (used >= plan.aiActionsPerMonth)
    return { ok: false as const, message: `You've used all ${plan.aiActionsPerMonth} AI actions on the ${plan.name} plan this month.${planOf(user) === "free" ? " Upgrade to Pro for more." : ""}` };
  await db.usageEvent.create({ data: { userId: user.id, kind } });
  return { ok: true as const, remaining: plan.aiActionsPerMonth - used - 1 };
}

export { billingConfigured, proPrices } from "./billing";
