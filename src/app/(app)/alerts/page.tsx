import Link from "next/link";
import { SavedSearchList } from "@/components/saved-searches";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db, parseJson } from "@/lib/db";
import { mailConfigured } from "@/lib/mailer";
import { PLANS, planOf } from "@/lib/plans";
import { hasSocialLogin } from "@/lib/oauth";

export const metadata = { title: "Job alerts" };

export default async function AlertsPage() {
  const user = await requireUser();
  const rows = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const verified = !!user.emailVerifiedAt || hasSocialLogin(user);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Saved searches & alerts" subtitle="Get a digest of new strong matches by email, daily or weekly." />
      {!verified && !user.isDemo && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verify your email to receive alerts. Check your inbox, or resend from <Link href="/settings" className="font-semibold underline">Settings</Link>.
        </div>
      )}
      {!mailConfigured() && (
        <p className="mb-4 text-xs text-slate-500">
          No email provider is configured on this server, so emails are captured in the{" "}
          {process.env.NODE_ENV !== "production" || user.isAdmin ? <Link href="/dev/outbox" className="font-semibold text-brand-600 underline">dev outbox</Link> : "dev outbox"} instead of being sent.
        </p>
      )}
      <SavedSearchList
        limit={PLANS[planOf(user)].savedSearches}
        initial={rows.map((s) => ({ id: s.id, name: s.name, frequency: s.frequency, lastAlertAt: s.lastAlertAt.toISOString(), filters: parseJson<Record<string, unknown>>(s.filters, {}) }))}
      />
    </div>
  );
}
