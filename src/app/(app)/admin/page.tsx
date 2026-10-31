import Link from "next/link";
import { AdminSources } from "@/components/admin-sources";
import { PageHeader } from "@/components/ui";
import { AI_MODEL, AI_PROVIDER, aiEnabled } from "@/lib/ai";
import { tavilyEnabled } from "@/lib/tavily";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sourceHealth } from "@/lib/jobs/registry";
import { mailConfigured } from "@/lib/mailer";
import { billingConfigured } from "@/lib/plans";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [sources, users, pro, jobs, gens] = await Promise.all([
    sourceHealth(),
    db.user.count({ where: { isDemo: false } }),
    db.user.count({ where: { plan: "pro" } }),
    db.job.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
    db.usageEvent.count({ where: { createdAt: { gte: monthStart } } }),
  ]);
  const integrations = [
    [AI_PROVIDER === "gemini" ? `Gemini (${AI_MODEL})` : "Claude (AI)", aiEnabled()],
    ["Voyage embeddings", !!process.env.VOYAGE_API_KEY],
    ["Email (Resend)", mailConfigured()],
    ["Web search (Tavily)", tavilyEnabled()],
    ["Razorpay payments", billingConfigured()],
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

    </div>
  );
}
