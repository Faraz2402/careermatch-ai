import { SettingsPanel } from "@/components/settings-panel";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, planOf, usageThisMonth } from "@/lib/plans";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ verified?: string; billing?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const plan = planOf(user);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Account, security, plan and your data." />
      <SettingsPanel
        flash={sp.verified === "1" ? "verified" : sp.verified === "0" ? "verify_failed" : sp.billing === "success" ? "billing" : null}
        account={{
          email: user.email,
          name: user.name,
          isDemo: user.isDemo,
          verified: !!user.emailVerifiedAt || !!user.googleId,
          google: !!user.googleId,
          plan,
          planName: PLANS[plan].name,
          proUntil: plan === "pro" && user.planRenewsAt ? user.planRenewsAt.toISOString() : null,
          payments: (await db.payment.findMany({ where: { userId: user.id, status: "paid" }, orderBy: { paidAt: "desc" }, take: 24 })).map((p) => ({
            id: p.id,
            paidAt: (p.paidAt ?? p.createdAt).toISOString(),
            amount: p.amount,
            period: p.period,
            method: p.method,
            paymentId: p.paymentId,
          })),
          used: await usageThisMonth(user.id),
          limit: PLANS[plan].aiActionsPerMonth,
        }}
      />
    </div>
  );
}
