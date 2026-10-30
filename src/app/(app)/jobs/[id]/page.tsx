import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyButton, FindOnLinks } from "@/components/apply-links";
import { GeneratorPanel, type BaseResume, type Gen } from "@/components/generator-panel";
import { JobTracker } from "@/components/job-tracker";
import { ScoreRing, SourceBadge } from "@/components/ui";
import { aiEnabled } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { unsealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { formatSalary, relativeDate } from "@/lib/format";
import { KIND_LABELS, type Kind } from "@/lib/generate";
import { decodeGeneration } from "@/lib/generations";
import { scoreJob } from "@/lib/jobs/rank";
import { sourceMeta } from "@/lib/jobs/registry";
import { formatUsdK } from "@/lib/jobs/salary";
import { jobRowToNormalized, loadMatchContext, salaryInsightFor } from "@/lib/jobs/service";
import { getProfile } from "@/lib/profile";
import { emptyResume, type ResumeData } from "@/lib/resume/schema";

type Props = { params: Promise<{ id: string }> };

async function loadJob(userId: string, rawId: string) {
  const id = decodeURIComponent(rawId);
  const row = await db.job.findUnique({ where: { id } });
  if (!row || (row.importedById && row.importedById !== userId)) return null;
  return row;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await db.job.findUnique({ where: { id: decodeURIComponent((await params).id) }, select: { title: true, company: true } });
  return { title: row ? `${row.title} · ${row.company}` : "Job" };
}

export default async function JobPage({ params }: Props) {
  const user = await requireUser();
  const row = await loadJob(user.id, (await params).id);
  if (!row) notFound();
  const id = row.id;

  const job = jobRowToNormalized(row);
  const [ctx, profile, versions, state, gens, insight] = await Promise.all([
    loadMatchContext(user.id),
    getProfile(user.id),
    db.resumeVersion.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    db.userJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } }),
    db.generation.findMany({ where: { userId: user.id, jobId: id }, orderBy: { createdAt: "desc" } }),
    salaryInsightFor(job),
  ]);
  const match = scoreJob(job, ctx);
  const meta = sourceMeta(job.source);

  const latest: Partial<Record<Kind, Gen>> = {};
  for (const g of gens) latest[g.kind as Kind] ??= decodeGeneration(g);

  const bases: BaseResume[] = [
    { id: null, name: "Primary profile", data: profile?.data ?? emptyResume() },
    ...versions.map((v) => ({ id: v.id, name: v.name, data: { ...emptyResume(), ...unsealJson<Partial<ResumeData>>(v.data, {}) } })),
  ];
  const salary = formatSalary(job);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Link href="/jobs" className="text-sm font-medium text-brand-600 hover:underline">← Back to jobs</Link>
        <header className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-extrabold">{job.title}</h1>
              <p className="mt-1 font-medium text-slate-700">{job.company}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>{job.location || "Location not stated"}</span>
                <span className="capitalize">{job.workMode === "unknown" ? "Arrangement not stated" : job.workMode}</span>
                {job.employmentType && <span className="capitalize">{job.employmentType}</span>}
                <span className={salary ? "font-semibold text-emerald-700" : ""}>{salary ?? "Salary not listed"}</span>
                <span>Posted {relativeDate(job.postedAt).toLowerCase()}</span>
              </div>
            </div>
            <ScoreRing value={match.score} size={76} label="Match score" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="space-y-1">
              <SourceBadge kind={meta.kind} name={meta.name} stale={match.stale} />
              <p className="text-xs text-slate-500">{meta.attribution} Last confirmed by the source {relativeDate(row.lastSeenAt).toLowerCase()}.</p>
            </div>
            {job.url ? (
              <ApplyButton job={job} />
            ) : (
              <span className="text-xs text-slate-500">{job.source === "demo" ? "Sample listing — there is no real application." : "No link provided."}</span>
            )}
          </div>
          <div className="mt-3">
            <FindOnLinks job={job} />
          </div>
        </header>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Why this score</h2>
          <p className="mt-1 text-xs text-slate-500">
            Relevance uses {match.semantic === "embeddings" ? "AI embeddings (Voyage)" : "text similarity and role-family matching"}. Your saves and hides adjust results over time.
          </p>
          <div className="mt-4 grid gap-2">
            {match.breakdown.map((b) => (
              <div key={b.label} className="grid grid-cols-[150px_1fr_50px] items-center gap-3 text-sm">
                <span className="text-slate-600">{b.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={b.max} aria-valuenow={b.points} aria-label={b.label}>
                  <div className={`h-full rounded-full ${b.points < 0 ? "bg-rose-400" : "bg-brand-500"}`} style={{ width: `${(Math.abs(b.points) / b.max) * 100}%` }} />
                </div>
                <span className="text-right font-medium tabular-nums">{b.points > 0 && b.label === "Your feedback" ? "+" : ""}{b.points}/{b.max}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Strengths</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{match.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <div className="mt-3 flex flex-wrap gap-1">{match.matched.map((s) => <span key={s} className="chip bg-emerald-50 text-emerald-700">✓ {s}</span>)}</div>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700">Concerns</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{match.concerns.length ? match.concerns.map((r) => <li key={r}>{r}</li>) : <li>None detected</li>}</ul>
              <div className="mt-3 flex flex-wrap gap-1">{match.missing.map((s) => <span key={s} className="chip bg-amber-50 text-amber-800">{s}</span>)}</div>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Salary insights</h2>
          {insight ? (
            <div className="mt-3">
              <p className="text-sm text-slate-600">
                Yearly pay for <b>{insight.family}</b> roles across {insight.sample} recent listings with salaries (converted to USD, approx.).
              </p>
              <div className="relative mt-6 mb-8 h-3 rounded-full bg-gradient-to-r from-slate-200 via-brand-200 to-slate-200">
                {[["25th", insight.p25], ["Median", insight.median], ["75th", insight.p75]].map(([label, v]) => {
                  const lo = insight.p25 * 0.7, hi = insight.p75 * 1.3;
                  const left = Math.max(0, Math.min(100, ((Number(v) - lo) / (hi - lo)) * 100));
                  return (
                    <div key={String(label)} className="absolute top-4 -translate-x-1/2 text-center text-[11px] text-slate-500" style={{ left: `${left}%` }}>
                      {label}<br /><b className="text-slate-700">{formatUsdK(Number(v))}</b>
                    </div>
                  );
                })}
                {insight.thisJob != null && (
                  <div className="absolute -top-1.5 size-6 -translate-x-1/2 rounded-full border-4 border-white bg-emerald-500 shadow" title="This job"
                    style={{ left: `${Math.max(0, Math.min(100, ((insight.thisJob - insight.p25 * 0.7) / (insight.p75 * 1.3 - insight.p25 * 0.7)) * 100))}%` }} />
                )}
              </div>
              <p className="text-sm">
                {insight.thisJob != null
                  ? <>This posting (~{formatUsdK(insight.thisJob)}) pays more than <b>{insight.percentile}%</b> of similar listings.</>
                  : "This posting doesn't list a salary — use the range above to anchor your negotiation."}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Not enough salary data for similar roles yet (needs at least 5 listings with pay).</p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Job description</h2>
          <div className="mt-4 max-h-[600px] overflow-y-auto text-sm leading-relaxed whitespace-pre-line text-slate-700">{job.description || "No description provided by the source."}</div>
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <JobTracker
          jobId={id}
          versions={bases.map((b) => ({ id: b.id, name: b.name }))}
          initial={{
            saved: state?.saved ?? false,
            status: state?.status ?? "none",
            notes: state?.notes ?? "",
            appliedAt: state?.appliedAt?.toISOString().slice(0, 10) ?? "",
            followUpAt: state?.followUpAt?.toISOString().slice(0, 10) ?? "",
            contactName: state?.contactName ?? "",
            contactEmail: state?.contactEmail ?? "",
            resumeVersionId: state?.resumeVersionId ?? null,
          }}
        />
        <GeneratorPanel jobId={id} labels={KIND_LABELS} initial={latest} aiEnabled={aiEnabled()} bases={bases} />
      </aside>
    </div>
  );
}
