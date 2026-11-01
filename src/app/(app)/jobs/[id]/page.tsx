import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyButton, JobLinks } from "@/components/apply-links";
import { GeneratorPanel, type BaseResume, type Gen } from "@/components/generator-panel";
import { JobEnricher } from "@/components/job-enricher";
import { ExpiredBadge, ListingStatus } from "@/components/listing-status";
import { JobTracker } from "@/components/job-tracker";
import { ScoreRing, SourceBadge } from "@/components/ui";
import { aiEnabled } from "@/lib/ai";
import { applyPlatform } from "@/lib/apply-links";
import { requireUser } from "@/lib/auth";
import { unsealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { formatMoney, formatSalary, relativeDate } from "@/lib/format";
import { KIND_LABELS, type Kind } from "@/lib/generate";
import { decodeGeneration } from "@/lib/generations";
import { needsEnrichment } from "@/lib/jobs/enrich";
import { scoreJob } from "@/lib/jobs/rank";
import { sourceMeta } from "@/lib/jobs/registry";
import { formatUsdK } from "@/lib/jobs/salary";
import { jobRowToNormalized, loadMatchContext, salaryInsightFor } from "@/lib/jobs/service";
import { exportNote, PLANS, planOf } from "@/lib/plans";
import { TailorLauncher } from "@/components/studio/tailor-launcher";
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

const barColor = (ratio: number) => (ratio >= 0.75 ? "bg-emerald-500" : ratio >= 0.4 ? "bg-amber-400" : "bg-rose-400");

export default async function JobPage({ params }: Props) {
  const user = await requireUser();
  const row = await loadJob(user.id, (await params).id);
  if (!row) notFound();
  const id = row.id;

  const job = jobRowToNormalized(row);
  const e = job.enrichment;
  const [ctx, profile, versions, state, gens, insight, resumeNote, letterNote] = await Promise.all([
    loadMatchContext(user.id),
    getProfile(user.id),
    db.resumeVersion.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    db.userJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } }),
    db.generation.findMany({ where: { userId: user.id, jobId: id }, orderBy: { createdAt: "desc" } }),
    e?.market ? null : salaryInsightFor(job).then((i) => (i && i.family !== "all roles" ? i : null)),
    exportNote(user, "resume"),
    exportNote(user, "cover_letter"),
  ]);
  const match = scoreJob(job, ctx);
  const meta = sourceMeta(job.source);
  // No analysis for expired listings: it would spend searches (and a free user's quota) on a dead job.
  const pending = aiEnabled() && !row.expiredAt && (!e || needsEnrichment(row));
  const aggregator = job.sourceUrl && !job.verifiedLink ? applyPlatform(job.sourceUrl) : null;

  const latest: Partial<Record<Kind, Gen>> = {};
  for (const g of gens) latest[g.kind as Kind] ??= decodeGeneration(g);

  const bases: BaseResume[] = [
    { id: null, name: "Primary profile", data: profile?.data ?? emptyResume() },
    ...versions.map((v) => ({ id: v.id, name: v.name, data: { ...emptyResume(), ...unsealJson<Partial<ResumeData>>(v.data, {}) } })),
  ];
  const salary = formatSalary(job);
  const market = e?.market;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <Link href="/jobs" className="text-sm font-medium text-brand-600 hover:underline">← Back to jobs</Link>
        <header className="card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-normal">{job.title}</h1>
              <p className="mt-1 font-medium text-slate-700">{job.company}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>{job.location || "Location not stated"}</span>
                <span className="capitalize">{job.workMode === "unknown" ? "Arrangement not stated" : job.workMode}</span>
                {job.employmentType && <span className="capitalize">{job.employmentType}</span>}
                <span className={salary ? "font-semibold text-emerald-700" : ""}>{salary ?? "Salary not listed"}</span>
                <span>Posted {relativeDate(job.postedAt).toLowerCase()}</span>
              </div>
              {job.expiredAt && <ExpiredBadge className="mt-3" />}
              <div className="mt-4"><TailorLauncher jobId={id} canUsePro={PLANS[planOf(user)].premiumTemplates} /></div>
            </div>
            <ScoreRing value={match.score} size={76} label="Match score" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="space-y-1">
              <SourceBadge kind={meta.kind} name={meta.name} stale={match.stale} />
              <p className="text-xs text-slate-500">
                Found via {meta.name}; last confirmed by the source {relativeDate(row.lastSeenAt).toLowerCase()}.
                {job.verifiedLink && " The apply link is the original posting, checked on the employer's site."}
              </p>
            </div>
            {job.url ? (
              <div className="flex flex-wrap items-center gap-2">
                {job.source !== "demo" && <ListingStatus jobId={id} expiredAt={job.expiredAt?.toISOString() ?? null} />}
                <ApplyButton job={job} />
              </div>
            ) : (
              <span className="text-xs text-slate-500">{job.source === "demo" ? "Sample listing — there is no real application." : "No link provided."}</span>
            )}
          </div>
          {(job.postedOn.length > 0 || job.verifiedLink) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Also posted on:</span>
              <JobLinks job={{ ...job, sourceName: meta.name }} hideApply />
            </div>
          )}
          {e && !job.verifiedLink && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              {e.notes.find((n) => /employer's own site|allowance/.test(n)) ?? "We couldn't confirm the original posting."}{" "}
              {e.careersUrl ? (
                <>You can check <a className="font-semibold underline" href={e.careersUrl} target="_blank" rel="noopener noreferrer">{job.company}&rsquo;s careers page ↗</a>{aggregator ? `, or view the listing on ${aggregator}.` : "."}</>
              ) : aggregator ? `The only link available is the ${aggregator} listing.` : null}
            </div>
          )}
        </header>

        <JobEnricher jobId={id} pending={pending} />

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Why this score</h2>
          <p className="mt-1 text-xs text-slate-500">
            {match.skillsFrom === "requirements"
              ? `Skills are the requirements AI read from the ${e?.fullDescription ? "full" : "listed"} description, checked against your profile.`
              : "Skills are spotted by keyword in the listing text."}{" "}
            Bars are green when strong, amber when partial and red when weak.
          </p>
          <div className="mt-4 divide-y divide-slate-100">
            {match.breakdown.map((b) => {
              const ratio = Math.abs(b.points) / b.max;
              return (
                <div key={b.label} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-x-3 gap-y-1 py-2.5 text-sm sm:grid-cols-[170px_minmax(0,1fr)_56px]">
                  <span className="font-medium text-slate-800">{b.label}</span>
                  <span className="text-right font-semibold tabular-nums sm:order-last">{b.points > 0 && b.label === "Your feedback" ? "+" : ""}{b.points}/{b.max}</span>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={b.max} aria-valuenow={b.points} aria-label={b.label}>
                      <div className={`h-full rounded-full ${b.points < 0 ? "bg-rose-400" : barColor(ratio)}`} style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{b.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold">Skills this job asks for</p>
            {match.matched.length + match.missing.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {match.matched.map((s) => <span key={s} className="chip bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">✓ {s}</span>)}
                {match.missing.map((s) => <span key={s} className="chip bg-rose-50 text-rose-800 ring-1 ring-rose-200">✗ {s}</span>)}
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-500">{pending ? "Reading the requirements…" : "The listing doesn't name specific skills."}</p>
            )}
            <p className="mt-2 text-xs text-slate-500"><span className="text-emerald-700">✓ Green</span>: on your profile · <span className="text-rose-700">✗ Red</span>: not found on your profile</p>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Strengths</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{match.reasons.length ? match.reasons.map((r) => <li key={r}>{r}</li>) : <li>None stood out</li>}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-rose-700">Concerns</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{match.concerns.length ? match.concerns.map((r) => <li key={r}>{r}</li>) : <li>None detected</li>}</ul>
            </div>
          </div>

          {e?.requirements && (e.requirements.minYears || e.requirements.education || e.requirements.responsibilities.length > 0) && (
            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
              {(e.requirements.minYears != null || e.requirements.education) && (
                <div className="space-y-1">
                  <p className="font-semibold">Requirements</p>
                  {e.requirements.minYears != null && <p className="text-slate-700">Experience: {e.requirements.minYears}+ years</p>}
                  {e.requirements.education && <p className="text-slate-700">Education: {e.requirements.education}</p>}
                </div>
              )}
              {e.requirements.responsibilities.length > 0 && (
                <div>
                  <p className="font-semibold">Key responsibilities</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">{e.requirements.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Salary insights</h2>
          {salary && <p className="mt-2 text-sm">This posting lists <b className="text-emerald-700">{salary}</b>.</p>}
          {market ? (
            <div className="mt-3">
              <p className="text-sm text-slate-600">{market.basis || `Market pay for similar roles (${market.period === "month" ? "monthly" : "yearly"}).`}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {([["Low", market.low], ["Typical", market.median], ["High", market.high]] as const).map(([label, v]) => (
                  <div key={label} className={`rounded-xl border p-3 ${label === "Typical" ? "border-brand-300 bg-brand-50" : "border-slate-200"}`}>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-0.5 font-display text-lg font-bold">{v != null ? formatMoney(v, market.currency, market.period) : "—"}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Figures as reported publicly by:{" "}
                {market.sources.map((s, i) => (
                  <span key={s.url}>{i > 0 && " · "}<a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand-700 hover:underline">{s.title} ↗</a></span>
                ))}
                . Found with Google Search; check the source before negotiating.
              </p>
            </div>
          ) : insight ? (
            <div className="mt-3">
              <p className="text-sm text-slate-600">
                No public market figures yet. Across {insight.sample} recent listings in our database with pay for <b>{insight.family}</b> roles (yearly, converted to USD, approx.):
              </p>
              <p className="mt-2 text-sm">25th {formatUsdK(insight.p25)} · median <b>{formatUsdK(insight.median)}</b> · 75th {formatUsdK(insight.p75)}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{pending ? "Looking up market salaries…" : e?.searchLimited ? "The free daily search allowance is used up; market pay will be looked up later." : "No public salary figures were found for this role and location."}</p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Job description</h2>
          <p className="mt-1 text-xs text-slate-500">
            {e?.fullDescription
              ? `Full description from the original posting on ${e.descriptionFrom}.`
              : job.source === "adzuna" || job.source === "jooble"
                ? `${meta.name} only provides a short preview of the description.${job.verifiedLink ? "" : " Open the listing for the full text."}`
                : `From ${meta.name}.`}
          </p>
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
        <GeneratorPanel jobId={id} labels={KIND_LABELS} initial={latest} aiEnabled={aiEnabled()} bases={bases} exportNotes={{ ats_resume: resumeNote, cover_letter: letterNote }} />
      </aside>
    </div>
  );
}
