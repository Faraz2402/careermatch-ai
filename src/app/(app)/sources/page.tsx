import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { relativeDate } from "@/lib/format";
import { sourceHealth } from "@/lib/jobs/registry";

export const metadata = { title: "Job sources" };

const KIND_LABEL: Record<string, string> = {
  official_api: "Official job API",
  employer_feed: "Employer career feed",
  aggregator: "Approved aggregator",
  demo: "Demo data",
};

export default async function SourcesPage() {
  await requireUser();
  const sources = await sourceHealth();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Job sources" subtitle="Where listings come from, how each source is accessed, and how healthy it is." />
      <div className="card mb-6 p-5 text-sm text-slate-700">
        <p className="font-semibold">Our sourcing policy</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Listings come only from official APIs, employer-published career feeds, approved aggregators, or links you add yourself.</li>
          <li>We never bypass logins, CAPTCHAs, paywalls, robots.txt or rate limits, and we don&apos;t scrape sites that prohibit it.</li>
          <li>Sources are refreshed in the background on each provider&apos;s cache schedule and rate limit. Every listing shows its source and posting date.</li>
          <li>Listings older than 30 days or without a date are flagged as possibly stale. Listings a source stops returning are removed within 7 days.</li>
          <li>Demo data is always labelled and never shown in production.</li>
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sources.map((s) => {
          const live = s.enabled && s.configured;
          const failing = live && s.lastRun && !s.lastRun.ok;
          return (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display font-bold">{s.name}</h2>
                  <p className="text-xs text-slate-500">{KIND_LABEL[s.kind] ?? s.kind}</p>
                </div>
                <span className={`chip ${failing ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : live ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-600"}`}>
                  {failing ? "Degraded" : live ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{s.attribution}</p>
              {!live && s.reason && <p className="mt-2 text-xs text-amber-700">{s.reason}</p>}
              {live && (
                <p className="mt-2 text-xs text-slate-500">
                  {s.listings} live listings · updated {s.lastSuccessAt ? relativeDate(s.lastSuccessAt).toLowerCase() : "not yet"}
                  {s.onDemandOnly && " · fetched when you search"}
                  {s.quota && ` · ${s.quota.cap - s.quota.used} free requests left`}
                  {s.successRate != null && ` · ${s.successRate}% successful (7d)`}
                </p>
              )}
              {failing && <p className="mt-1 text-xs text-amber-700">Last attempt failed: {s.lastRun!.error}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {s.cacheMinutes > 0 && <span>Refresh: every {s.cacheMinutes >= 60 ? `${s.cacheMinutes / 60}h` : `${s.cacheMinutes}m`}</span>}
                {s.kind !== "demo" && <span>Limit: {s.requestsPerMinute} req/min</span>}
                {s.termsUrl && <a href={s.termsUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">API terms ↗</a>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
