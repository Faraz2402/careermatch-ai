import { AdminInterviewQa } from "@/components/admin-interview-qa";
import Link from "next/link";
import { AdminSources } from "@/components/admin-sources";
import { PageHeader } from "@/components/ui";
import { aiEnabled, providerOrder, providerStatus } from "@/lib/ai";
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
  const providers = providerStatus();
  const integrations = [
    [`AI (${providerOrder().length} provider${providerOrder().length === 1 ? "" : "s"})`, aiEnabled()],
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

      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">AI providers</h2>
        <p className="mt-1 text-xs text-slate-500">Tried in this order. When a model hits its free limit it&apos;s paused until it resets and the next one answers. Order: <code>AI_PROVIDER_ORDER</code>; models: <code>GROQ_MODELS</code>, <code>CEREBRAS_MODELS</code>… (this server instance&apos;s view).</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <li key={p.id} className={`rounded-xl border p-3 text-xs ${p.configured ? "border-slate-200" : "border-dashed border-slate-200 opacity-60"}`}>
              <p className="font-semibold">{p.configured ? "●" : "○"} {p.label} {!p.configured && <span className="font-normal text-slate-500">— no API key</span>}</p>
              {p.configured && (
                <ul className="mt-1 space-y-0.5">
                  {p.models.map((m) => <li key={m.model} className="flex justify-between gap-2"><code className="truncate">{m.model}</code><span className={m.pausedUntil ? "text-amber-600" : "text-emerald-600"}>{m.pausedUntil ? `paused until ${new Date(m.pausedUntil).toLocaleTimeString()}` : "ready"}</span></li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      <AdminSources initial={sources} />
      <AdminInterviewQa />

    </div>
  );
}
