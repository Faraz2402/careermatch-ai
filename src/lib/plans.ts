import "server-only";
import { db } from "./db";

export const PLANS = {
  free: { name: "Free", aiActionsPerMonth: 15, savedSearches: 2, resumeVersions: 2 },
  pro: { name: "Pro", aiActionsPerMonth: 400, savedSearches: 20, resumeVersions: 20 },
} as const;

export type PlanId = keyof typeof PLANS;

/** Pro is prepaid: it counts only until the paid period ends. */
export const planOf = (u: { plan: string; planRenewsAt?: Date | string | null }): PlanId =>
  u.plan === "pro" && (!u.planRenewsAt || new Date(u.planRenewsAt) > new Date()) ? "pro" : "free";

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export async function usageThisMonth(userId: string) {
  return db.usageEvent.count({ where: { userId, createdAt: { gte: monthStart() } } });
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
