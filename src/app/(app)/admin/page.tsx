import Link from "next/link";
import { AdminSources } from "@/components/admin-sources";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { relativeDate } from "@/lib/format";
import { sourceHealth } from "@/lib/jobs/registry";
import { mailConfigured } from "@/lib/mailer";
import { billingConfigured } from "@/lib/plans";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [sources, users, pro, jobs, gens, failures] = await Promise.all([
    sourceHealth(),
    db.user.count({ where: { isDemo: false } }),
    db.user.count({ where: { plan: "pro" } }),
    db.job.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    db.usageEvent.count({ where: { createdAt: { gte: monthStart } } }),
    db.sourceRun.findMany({ where: { ok: false }, orderBy: { startedAt: "desc" }, take: 8 }),
  ]);
  const integrations = [
    ["Claude (AI)", !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)],
    ["Voyage embeddings", !!process.env.VOYAGE_API_KEY],
    ["Email (Resend)", mailConfigured()],
    ["Stripe billing", billingConfigured()],
    ["Google sign-in", !!process.env.GOOGLE_CLIENT_ID],
    ["Redis rate limits", !!process.env.UPSTASH_REDIS_REST_URL],
    ["Encryption key", !!process.env.DATA_ENCRYPTION_KEY],
    ["Error webhook", !!process.env.ERROR_WEBHOOK_URL],
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader title="Admin" subtitle="Operate job sources and check system health." actions={<Link href="/dev/outbox" className="btn-secondary">Email outbox</Link>} />

      <div className="grid gap-4 sm:grid-cols-4">
        {[["Users", users], ["Pro subscribers", pro], ["Live listings (7d)", jobs], ["AI actions this month", gens]].map(([l, v]) => (
          <div key={String(l)} className="card p-5"><p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{l}</p><p className="mt-2 font-display text-3xl font-extrabold">{v}</p></div>
        ))}
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Integrations</h2>
        <div className="flex flex-wrap gap-2">
          {integrations.map(([name, ok]) => (
            <span key={name} className={`chip ${ok ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}>{ok ? "●" : "○"} {name}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Secrets are configured through environment variables and never stored in the database.</p>
      </section>

      <AdminSources initial={sources} />

      <section className="card p-5">
        <h2 className="mb-3 font-display text-lg font-bold">Recent source failures</h2>
        {failures.length === 0 ? <p className="text-sm text-slate-500">No failures recorded. 🎉</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {failures.map((f) => <li key={f.id} className="flex justify-between gap-4 py-2"><span><b>{f.source}</b> — {f.error}</span><span className="shrink-0 text-xs text-slate-500">{relativeDate(f.startedAt).toLowerCase()}</span></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
