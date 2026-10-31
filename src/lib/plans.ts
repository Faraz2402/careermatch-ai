import "server-only";
import { db } from "./db";

export const PLANS = {
  // resumeExports: distinct tailored résumés that can be downloaded as PDF/Word (null = unlimited)
  free: { name: "Free", aiActionsPerMonth: 15, savedSearches: 2, resumeVersions: 2, resumeExports: 1 },
  pro: { name: "Pro", aiActionsPerMonth: 400, savedSearches: 20, resumeVersions: 20, resumeExports: null },
} as const;

export type PlanId = keyof typeof PLANS;

/** Pro is prepaid: it counts only until the paid period ends. */
export const planOf = (u: { plan: string; planRenewsAt?: Date | string | null }): PlanId =>
  u.plan === "pro" && (!u.planRenewsAt || new Date(u.planRenewsAt) > new Date()) ? "pro" : "free";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/** Exports are logged as usage events too, but don't count toward AI actions. */
const EXPORT_KIND = "export:resume:";

export async function usageThisMonth(userId: string) {
  return db.usageEvent.count({ where: { userId, createdAt: { gte: monthStart() }, NOT: { kind: { startsWith: EXPORT_KIND } } } });
}

/**
 * May this user download this tailored résumé as PDF/Word? The free plan
 * allows one résumé; re-downloading it (any format or template) stays free.
 */
export async function claimResumeExport(user: { id: string; plan: string; planRenewsAt?: Date | null }, generationId: string) {
  const limit = PLANS[planOf(user)].resumeExports;
  const kind = `${EXPORT_KIND}${generationId}`;
  const done = await db.usageEvent.findMany({ where: { userId: user.id, kind: { startsWith: EXPORT_KIND } }, select: { kind: true }, distinct: ["kind"] });
  if (done.some((e) => e.kind === kind)) return true;
  if (limit !== null && done.length >= limit) return false;
  await db.usageEvent.create({ data: { userId: user.id, kind } });
  return true;
}

/** How many different résumés this user has exported. */
export async function resumeExportsUsed(userId: string) {
  return (await db.usageEvent.findMany({ where: { userId, kind: { startsWith: EXPORT_KIND } }, select: { kind: true }, distinct: ["kind"] })).length;
}

/** Checks the monthly AI quota and records one action when allowed. */
export async function consumeAiAction(user: { id: string; plan: string; planRenewsAt?: Date | null }, kind: string) {
  const plan = PLANS[planOf(user)];
  const used = await usageThisMonth(user.id);
  if (used >= plan.aiActionsPerMonth)
    return { ok: false as const, message: `You've used all ${plan.aiActionsPerMonth} AI actions on the ${plan.name} plan this month.${planOf(user) === "free" ? " Upgrade to Pro for more." : ""}` };
  await db.usageEvent.create({ data: { userId: user.id, kind } });
  return { ok: true as const, remaining: plan.aiActionsPerMonth - used - 1 };
}

export { billingConfigured, proPrices } from "./billing";
