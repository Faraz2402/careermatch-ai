import { Bookmark, FileText, KanbanSquare, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CountUp } from "@/components/count-up";
import { EmptyState, PageHeader, ScoreRing } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatSalary, relativeDate, STATUS_LABELS } from "@/lib/format";
import { KIND_LABELS, type Kind } from "@/lib/generate";
import { loadUserContext, searchJobs, STRONG_MATCH } from "@/lib/jobs/service";
import { PLANS, planOf, usageThisMonth } from "@/lib/plans";
import { atsReadiness, profileCompleteness, resumeHealth, type ScoreReport } from "@/lib/scores";

export const metadata = { title: "Dashboard" };

function ScoreCard({ title, report, hint }: { title: string; report: ScoreReport; hint: string }) {
  const failing = report.checks.filter((c) => !c.ok);
  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <ScoreRing value={report.score} size={64} label={title} />
        <div>
          <h3 className="font-display font-bold">{title}</h3>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1.5 text-xs">
        {report.checks.slice(0, 5).map((c) => (
          <li key={c.label} className="flex items-start gap-2">
            <span className={c.ok ? "text-emerald-600" : "text-slate-400"} aria-label={c.ok ? "passed" : "not yet"}>{c.ok ? "✓" : "○"}</span>
            <span className={c.ok ? "text-slate-600" : "text-slate-800"}>{c.label}</span>
          </li>
        ))}
        {report.checks.length > 5 && <li className="pl-5 text-slate-500">+{report.checks.length - 5} more checks{failing.length ? ` · ${failing.length} to fix` : ""}</li>}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub, href, icon: Icon, tone }: { label: string; value: React.ReactNode; sub: string; href: string; icon: LucideIcon; tone: string }) {
  return (
    <Link href={href} className="card card-hover relative overflow-hidden p-5">
      <span aria-hidden className="absolute -top-8 -right-8 size-28 rounded-full opacity-[0.14]" style={{ background: `radial-gradient(closest-side, ${tone}, transparent)` }} />
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${tone}, ${tone}bb)` }}><Icon className="size-[18px]" aria-hidden /></span>
      </div>
      <p className="mt-3 font-display text-4xl font-extrabold text-slate-900">{typeof value === "number" ? <CountUp to={value} /> : value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </Link>
  );
}

/** Streams in after the rest of the dashboard (job search is the slow part). */
async function Matches({ userId }: { userId: string }) {
  const jobs = await searchJobs(userId, { pageSize: 3 }).catch(() => null);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Top matches {jobs && <span className="text-sm font-normal text-slate-500">· {jobs.total} matched, {jobs.strongMatches} strong ({STRONG_MATCH}+)</span>}</h2>
        <Link href="/jobs" className="text-sm font-medium text-brand-600 hover:underline">See all →</Link>
      </div>
      {!jobs ? (
        <p className="text-sm text-rose-600">Job sources are unavailable right now. Try again shortly.</p>
      ) : jobs.top.length === 0 ? (
        <p className="text-sm text-slate-500">No matches yet. Adjust your <Link href="/preferences" className="text-brand-600 underline">preferences</Link> or add a job link.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {jobs.top.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${encodeURIComponent(j.id)}`} className="flex items-center gap-4 rounded-lg py-3 hover:bg-slate-50">
                <ScoreRing value={j.match.score} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{j.title}</p>
                  <p className="truncate text-xs text-slate-500">{j.company} · {j.location || j.workMode} · {formatSalary(j) ?? "Salary not listed"}</p>
                </div>
                <span className={`chip ${j.sourceKind === "demo" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{j.sourceKind === "demo" ? "Demo" : j.sourceName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MatchesSkeleton() {
  return (
    <section className="card animate-pulse p-5" aria-busy="true" aria-label="Loading matches">
      <div className="mb-4 h-6 w-40 rounded bg-slate-200" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <div className="size-11 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div>
        </div>
      ))}
    </section>
  );
}

export default async function Dashboard() {
  const user = await requireUser();
  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { isPublic: true } });
  if (!profile)
    return (
      <div>
        <PageHeader title={`Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}!`} subtitle="Let's turn your resume into a smarter job search." />
        <EmptyState
          title="Start with your resume"
          body="Upload a PDF or DOCX (or paste text). We'll build your profile, score it, and start matching jobs."
          action={<Link href="/onboarding" className="btn-primary">Upload resume</Link>}
        />
      </div>
    );

  const { resume, prefs } = await loadUserContext(user.id);
  const [savedCount, tracked, recentGens, used, searches] = await Promise.all([
    db.userJob.count({ where: { userId: user.id, saved: true } }),
    db.userJob.findMany({ where: { userId: user.id, status: { not: "none" } }, include: { job: true }, orderBy: { updatedAt: "desc" }, take: 5 }),
    db.generation.findMany({ where: { userId: user.id }, include: { job: { select: { id: true, title: true, company: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    usageThisMonth(user.id),
    db.savedSearch.count({ where: { userId: user.id } }),
  ]);
  const followUps = tracked.filter((t) => t.followUpAt && t.followUpAt.getTime() < Date.now() && ["interested", "applied", "interviewing"].includes(t.status));

  const health = resumeHealth(resume);
  const ats = atsReadiness(resume);
  const complete = profileCompleteness(resume, prefs, profile.isPublic);
  const actions = [
    ...(followUps.length ? [{ fix: `Follow up on ${followUps.length} application${followUps.length > 1 ? "s" : ""} (overdue)`, href: "/applications", weight: 100 }] : []),
    ...(searches === 0 ? [{ fix: "Save a search to get new matches by email", href: "/jobs", weight: 12 }] : []),
    ...[...complete.checks, ...ats.checks, ...health.checks].filter((c) => !c.ok),
  ]
    .sort((a, b) => b.weight - a.weight)
    .filter((c, i, arr) => arr.findIndex((x) => x.fix === c.fix) === i)
    .slice(0, 5);
  const plan = PLANS[planOf(user)];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back${resume.name ? `, ${resume.name.split(" ")[0]}` : ""}`}
        subtitle={resume.headline}
        actions={<><Link href="/onboarding" className="btn-secondary">Update resume</Link><Link href="/jobs" className="btn-primary">Find jobs</Link></>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Saved jobs" value={savedCount} sub="Shortlisted roles" href="/jobs" icon={Bookmark} tone="#4263ff" />
        <Stat label="Applications tracked" value={tracked.length} sub={followUps.length ? `${followUps.length} follow-up overdue` : tracked[0] ? `Latest: ${STATUS_LABELS[tracked[0].status]}` : "Track status from any job"} href="/applications" icon={KanbanSquare} tone="#8457ff" />
        <Stat label="Documents generated" value={recentGens.length} sub="Resumes, letters & analyses" href="/jobs" icon={FileText} tone="#20c997" />
        <Stat label="AI actions" value={<><CountUp to={used} /><span className="text-base font-semibold text-slate-400"> / {plan.aiActionsPerMonth}</span></>} sub={`${plan.name} plan · this month`} href="/settings" icon={Sparkles} tone="#19c6e8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreCard title="Resume health" report={health} hint="Content quality & impact" />
        <ScoreCard title="ATS readiness" report={ats} hint="How well systems can parse you" />
        <ScoreCard title="Profile completeness" report={complete} hint="Profile, preferences & publishing" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Suspense fallback={<MatchesSkeleton />}>
          <Matches userId={user.id} />
        </Suspense>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Recommended next actions</h2>
          {actions.length === 0 ? (
            <p className="text-sm text-slate-600">Your profile is in great shape. Start tailoring applications for your top matches.</p>
          ) : (
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={a.fix}>
                  <Link href={a.href} className="flex items-start gap-3 rounded-lg p-2 text-sm hover:bg-slate-50">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span>
                    <span>{a.fix}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Recent resumes & cover letters</h2>
          {recentGens.length === 0 ? (
            <p className="text-sm text-slate-500">Open any job and use the Application toolkit to generate tailored materials.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {recentGens.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{KIND_LABELS[g.kind as Kind] ?? g.kind}{g.finalContent && <span className="ml-2 chip bg-emerald-50 text-emerald-700">reviewed</span>}</p>
                    <p className="truncate text-xs text-slate-500">{g.job ? `${g.job.title} · ${g.job.company}` : "Job removed"} · {relativeDate(g.createdAt).toLowerCase()}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {(g.kind === "ats_resume" || g.kind === "cover_letter") && <a href={`/api/generations/${g.id}/export?format=pdf`} className="btn-ghost px-2 py-1 text-xs">PDF</a>}
                    {g.job && <Link href={`/jobs/${encodeURIComponent(g.job.id)}`} className="btn-ghost px-2 py-1 text-xs">Open</Link>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Application pipeline</h2>
            <Link href="/applications" className="text-sm font-medium text-brand-600 hover:underline">Board →</Link>
          </div>
          {tracked.length === 0 ? (
            <p className="text-sm text-slate-500">Set a status (Interested, Applied, Interviewing…) on any job to track it here.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {tracked.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/jobs/${encodeURIComponent(t.jobId)}`} className="min-w-0 hover:text-brand-700">
                    <p className="truncate font-medium">{t.job.title}</p>
                    <p className="truncate text-xs text-slate-500">{t.job.company}</p>
                  </Link>
                  <span className="chip shrink-0 bg-brand-50 text-brand-700">{STATUS_LABELS[t.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
