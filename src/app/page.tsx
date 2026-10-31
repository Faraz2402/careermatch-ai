import Link from "next/link";
import { DemoButton } from "@/components/client";
import { Logo, ScoreRing } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  { icon: "📄", title: "Resume analysis", body: "Upload a PDF or DOCX and get a structured, editable breakdown with a resume health score and concrete fixes." },
  { icon: "🎯", title: "Explainable job matching", body: "Listings from official APIs and employer career feeds, ranked by fit — with the reasons and the gaps spelled out." },
  { icon: "🤖", title: "ATS optimization", body: "Generate a version of your resume tuned to each posting's language, without inventing experience you don't have." },
  { icon: "🌐", title: "Shareable profile page", body: "A clean public profile with a custom URL, privacy controls for every section, and a contact call to action." },
  { icon: "✉️", title: "Cover letters & talking points", body: "Targeted cover letters, screening-question answers, and STAR stories grounded in your real achievements." },
  { icon: "🛡️", title: "Compliance built in", body: "No scraping behind logins or CAPTCHAs. Every listing shows its source, posting date, and whether it may be stale." },
];

export default async function Landing() {
  const user = await getCurrentUser();
  return (
    <div className="bg-surface">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Sign in</Link>
                <Link href="/signup" className="btn-primary">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,var(--color-brand-100),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200">Resume → profile → matched jobs → tailored applications</span>
            <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn your resume into a <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">smarter job search.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              CareerMatch AI reads your resume, builds a professional profile page, finds roles from trusted job sources, and drafts ATS-ready applications for each one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={user ? "/onboarding" : "/signup"} className="btn-primary px-6 py-3 text-base">Upload Resume</Link>
              {user ? (
                <Link href="/jobs" className="btn-secondary px-6 py-3 text-base">Browse jobs</Link>
              ) : (
                <DemoButton className="btn-secondary px-6 py-3 text-base">Try Demo</DemoButton>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-500">The demo uses a fictional resume and clearly-labelled sample listings.</p>
          </div>

          <div className="card relative p-6 shadow-xl shadow-brand-900/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Example match</p>
                <h3 className="mt-1 font-display text-lg font-bold">Senior Frontend Engineer</h3>
                <p className="text-sm text-slate-600">Remote (US) · $150k–$185k/yr · 2 days ago</p>
              </div>
              <ScoreRing value={86} />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="font-medium text-emerald-700">✓ Why it fits</p>
                <ul className="mt-1 list-inside list-disc text-slate-600">
                  <li>You have 7 of 9 skills this posting mentions</li>
                  <li>Seniority (senior) fits your level</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-amber-700">△ Gaps to address</p>
                <p className="mt-1 text-slate-600">Not on your profile: Playwright, accessibility audits</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {["ATS resume", "Cover letter", "Talking points"].map((t) => (
                <span key={t} className="chip bg-slate-100 text-slate-700">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight">Everything you need to apply with confidence</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">From the first upload to a tailored application — honest, explainable, and in your control.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-display font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-4">
            {["Upload or paste your resume", "Review your parsed profile", "Set your job preferences", "Get ranked matches & tailored materials"].map((s, i) => (
              <li key={s} className="text-center">
                <div className="mx-auto grid size-10 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</div>
                <p className="mt-3 text-sm font-medium text-slate-700">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-700 p-10 text-center text-white">
            <h3 className="font-display text-2xl font-extrabold">Ready for a smarter search?</h3>
            <p className="mt-2 text-white/80">It takes about two minutes to go from resume to ranked matches.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={user ? "/onboarding" : "/signup"} className="btn bg-surface px-6 py-3 text-brand-700 hover:bg-brand-50">Upload Resume</Link>
              {!user && <DemoButton className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Try Demo</DemoButton>}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-500">
        Job data comes only from connected, authorized sources and is shown with attribution. © {new Date().getFullYear()} CareerMatch AI.
      </footer>
    </div>
  );
}
