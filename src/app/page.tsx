import { ArrowRight, BadgeCheck, Lock, ScanSearch, UserRoundX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DemoButton } from "@/components/client";
import { FeatureShowcase } from "@/components/feature-showcase";
import { BgFx, DocShowcase, HeroCollage, Photo, PracticeArt, PracticeFeatures, ProductTiles, StudioCollage, type PhotoName } from "@/components/home/blocks";
import { JsonLd, organization, softwareApplication } from "@/components/json-ld";
import { LandingFx } from "@/components/landing-fx";
import { LandingNav } from "@/components/landing-nav";
import { CountUp } from "@/components/count-up";
import { HomeExamples } from "@/components/resume-examples/home-examples";
import { featured, formatFor, publishedRoles, visibleCategories } from "@/lib/resume-examples/data";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEGAL_LINKS } from "@/lib/legal";
import { appUrl } from "@/lib/site-url";
import { TEMPLATES } from "@/lib/templates/catalog";

export const metadata: Metadata = {
  title: { absolute: "CareerMatch AI: AI Résumé Builder & Job Matching for India" },
  description: "Upload your résumé and get jobs ranked for you across India and worldwide: match scores with reasons, skill gaps, employer apply links, salaries in ₹, and AI-tailored résumés and cover letters. Free to start.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "CareerMatch AI: your career, powered by AI", description: "Upload your résumé and get jobs ranked for you across India and worldwide: match scores with reasons, skill gaps, employer apply links, salaries in ₹, and AI-tailored résumés and cover letters. Free to start." },
};

type SourceKind = "employer" | "board" | "remote";

// Employer career-site platforms first, then job boards, then remote-job boards.
const SOURCES: { name: string; kind: SourceKind }[] = [
  ...["Greenhouse", "Lever", "Ashby", "SmartRecruiters", "Workable", "SuccessFactors", "Oracle"].map((name) => ({ name, kind: "employer" as const })),
  ...["Adzuna", "Jooble"].map((name) => ({ name, kind: "board" as const })),
  ...["We Work Remotely", "Remote OK", "Himalayas", "Jobicy", "Remotive", "Working Nomads", "Findwork", "Real Work From Anywhere"].map((name) => ({ name, kind: "remote" as const })),
];

const STEPS = [
  { n: "1", title: "Drop in your résumé", body: "PDF, DOCX or plain text. AI turns it into a clean, editable profile in seconds." },
  { n: "2", title: "Tell us what you want", body: "Roles, cities, salary floor, work style. Every country, every major Indian city." },
  { n: "3", title: "Read the shortlist", body: "Fresh roles ranked against you, each with its score, its gaps and its real apply link." },
  { n: "4", title: "Apply like an insider", body: "A tailored ATS résumé, cover letter and talking points for every role you choose." },
];

const PERSONAS: { photo: PhotoName; alt: string; pos: string; who: string; line: string }[] = [
  { photo: "persona-grad", alt: "A smiling graduate in a cap and gown adjusting her cap", pos: "55% 30%", who: "Graduating students", line: "Turn a degree and a few projects into a résumé that recruiters and ATS filters both read." },
  { photo: "persona-early", alt: "A smiling young professional working on his laptop", pos: "68% 30%", who: "Early-career professionals", line: "Show real impact from your first roles and find the step up that fits." },
  { photo: "persona-senior", alt: "A smiling professional in a blue suit at his desk", pos: "50% 28%", who: "Experienced professionals", line: "Tailor a senior résumé to each role without diluting years of experience." },
  { photo: "persona-switch", alt: "A smiling woman with curly hair and glasses in a bright office", pos: "76% 35%", who: "Career switchers", line: "Reframe what you have already done for a new field, honestly." },
];

const PRINCIPLES = [
  [Lock, "No scraping behind logins", "Listings come from official APIs and public employer feeds, each shown with its source and when it was last seen."],
  [UserRoundX, "No invented experience", "Every suggestion is grounded in your own résumé, and you approve each change before it is saved."],
  [ScanSearch, "No selling your data", "Your résumé stays yours. Public profile sections stay off until you switch them on."],
] as const;

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as React.CSSProperties;

const ArrowLink = ({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) => (
  <Link href={href} className={`group inline-flex items-center gap-2 text-base font-bold underline decoration-2 underline-offset-[6px] ${className}`}>
    {children}
    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
  </Link>
);

/** Live size of the question bank, rounded down (e.g. "1,100+"); null when unknown or small. */
async function questionCount() {
  try {
    const n = await db.interviewQuestion.count({ where: { status: "published" } });
    return n >= 100 ? `${(Math.floor(n / 100) * 100).toLocaleString("en-US")}+` : null;
  } catch {
    return null;
  }
}

export default async function Landing() {
  const [user, qCount] = await Promise.all([getCurrentUser(), questionCount()]);
  const start = user ? "/onboarding" : "/signup";

  return (
    <div className="force-dark relative min-h-screen overflow-x-clip">
      <LandingFx />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organization(), { "@type": "WebSite", "@id": `${appUrl()}/#site`, name: "CareerMatch AI", url: `${appUrl()}/`, inLanguage: "en-IN", publisher: { "@id": `${appUrl()}/#org` } }, softwareApplication()],
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#070b16]/85 backdrop-blur-md">
        <div className="shell flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5" aria-label="CareerMatch AI home">
              <Image src="/brand/mark.png" alt="" width={32} height={32} priority unoptimized className="size-8" />
              <span className="font-display text-xl text-slate-900">CareerMatch</span>
            </Link>
            <LandingNav className="hidden md:block" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary !px-5">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-brand-500 hover:text-brand-700 sm:block">Sign in</Link>
                <Link href="/signup" className="btn-primary !px-5">Get started</Link>
              </>
            )}
          </div>
        </div>
        <LandingNav className="flex justify-center border-t border-white/[0.06] pb-1 md:hidden" />
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#070b16] text-white">
          <BgFx />
          <div aria-hidden className="pointer-events-none absolute -top-[22rem] right-[-14rem] size-[52rem] rounded-full border border-white/[0.06]" />
          <div aria-hidden className="pointer-events-none absolute -top-[14rem] right-[-6rem] size-[36rem] rounded-full border border-[#8457ff]/20" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4263ff]/50 to-transparent" />
          <div className="shell relative grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-24">
            <div>
              <h1 className="reveal-now font-serif text-[clamp(3.47rem,7.26vw,7.62rem)] leading-[0.95] font-normal tracking-[-0.02em]">
                Your Career.
                <br />
                <em className="text-[#a3b8ff] italic">Powered by AI.</em>
              </h1>
              <p className="reveal-now mt-8 max-w-[34rem] text-lg leading-relaxed text-[#d5daee] sm:text-xl" style={delay(120)}>
                Create standout resumes, write tailored cover letters, and discover global job opportunities with one intelligent career platform.
              </p>
              <div className="reveal-now mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={delay(220)}>
                <Link href={start} className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#10152b] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">Build My Resume <ArrowRight className="size-4" aria-hidden /></Link>
                {user ? (
                  <ArrowLink href="/jobs" className="text-white decoration-white/60 hover:decoration-white">Explore Jobs</ArrowLink>
                ) : (
                  <DemoButton className="group inline-flex items-center gap-2 text-base font-bold text-white underline decoration-white/60 decoration-2 underline-offset-[6px] hover:decoration-white">Explore Jobs <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden /></DemoButton>
                )}
              </div>
              <p className="reveal-now mt-6 text-sm text-[#aab3d1]" style={delay(300)}>Free to start. No card. The demo uses a fictional résumé and labelled sample listings.</p>
            </div>
            <div className="reveal-now" style={delay(150)}>
              <HeroCollage />
            </div>
          </div>
        </section>

        {/* Statement + sources */}
        <section className="relative overflow-hidden bg-[#0b1122] text-white" aria-label="Job sources">
          <svg aria-hidden className="absolute inset-0 size-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 40" fill="none" stroke="#4263ff" strokeWidth=".12">
            <path d="M60 0 L100 40" /><path d="M72 0 L100 28" /><path d="M48 0 L100 52" />
          </svg>
          <div className="shell relative py-16 lg:py-24">
            <p className="reveal max-w-5xl font-serif text-[clamp(2.24rem,4.62vw,4.48rem)] leading-[1.08] font-normal tracking-[-0.02em]">
              Honest matching, built on your real experience. And trust in your job search gets restored.
            </p>
          </div>
          <div className="relative border-t border-white/10">
            <div className="shell flex flex-col gap-4 py-6 md:flex-row md:items-center md:gap-10">
              <p className="shrink-0 text-sm font-semibold text-[#d5daee]">Listings from official APIs and employer feeds</p>
              <div className="lux-marquee min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)]">
                <ul className="lux-marquee-track flex w-max">
                  {[...SOURCES, ...SOURCES].map((s, i) => (
                    <li key={i} aria-hidden={i >= SOURCES.length || undefined} className="pr-8">
                      <span className="font-serif text-2xl whitespace-nowrap text-white/90">{s.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Everything you need */}
        <section id="product" className="relative scroll-mt-20 bg-[#0c1330]">
          <div className="shell relative py-20 lg:py-28">
          <h2 className="reveal max-w-4xl font-serif text-[clamp(2.91rem,5.72vw,5.6rem)] leading-[1.02] font-normal tracking-[-0.015em] text-slate-900">
            Everything you need to <em className="text-brand-600 italic">land the role</em>
          </h2>
          <p className="reveal mt-6 max-w-2xl text-lg text-slate-600" style={delay(100)}>
            Every listing is read, scored and traced back to its source before it reaches you, so your time goes on applications that can land.
          </p>
          <div className="mt-14">
            <ProductTiles href={start} />
          </div>
          <p className="mt-8 text-xs text-slate-500">Cards above are illustrations with sample data. Portraits are licensed stock photographs, not customers.</p>
          </div>
        </section>

        {/* Glowing documents */}
        <section className="relative overflow-hidden bg-[#080d1c]">
          <BgFx beam={false} />
          <div className="shell relative py-20 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold tracking-[0.14em] text-[#a3b8ff] uppercase">Written for every job</p>
              <h2 className="reveal mt-4 font-serif text-[clamp(2.7rem,5.3vw,5.15rem)] leading-[1.02] font-normal tracking-[-0.015em] text-white">Résumés and cover letters that <em className="text-[#a3b8ff] italic">write themselves.</em></h2>
              <p className="reveal mt-5 text-lg text-[#b3bbd9]" style={delay(100)}>Paste a job and watch your résumé, cover letter and ATS report update together, every line traced to your own experience.</p>
            </div>
            <div className="mt-16"><DocShowcase /></div>
            <p className="mt-10 text-center text-xs text-[#8b95ba]">Animated samples for illustration.</p>
          </div>
        </section>

        {/* Studio split */}
        <section className="border-y border-white/[0.06] bg-[#0a1020]">
          <div className="shell grid items-center gap-14 py-20 lg:grid-cols-2 lg:gap-24 lg:py-28">
            <div className="reveal"><StudioCollage /></div>
            <div className="reveal" style={delay(100)}>
              <p className="text-sm font-bold tracking-[0.14em] text-brand-700 uppercase">AI résumé studio</p>
              <h2 className="mt-4 font-serif text-[clamp(2.46rem,4.4vw,4.26rem)] leading-[1.05] font-normal tracking-[-0.015em] text-slate-900">A résumé tailored to every job, never invented.</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">Upload once. For each role, see which requirements you meet, quote your own evidence, and approve every rewrite before it touches your résumé.</p>
              <ul className="mt-7 space-y-3.5">
                {["ATS score and keyword gap, each marked exact, equivalent, partial or missing", "Bullet rewrites with reasons: accept, edit or reject. Invented numbers are blocked", "A matching cover letter in three tones, with Word and PDF export"].map((t) => (
                  <li key={t} className="flex gap-3 text-base text-slate-700">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#dff7ee] text-[#0b7a5a]"><BadgeCheck className="size-3.5" aria-hidden /></span>{t}
                  </li>
                ))}
              </ul>
              <div className="mt-9"><ArrowLink href={start} className="text-slate-900 decoration-brand-500">Open the studio</ArrowLink></div>
            </div>
          </div>
        </section>

        {/* Resume examples */}
        <section id="resume-examples" className="relative scroll-mt-20 border-y border-white/[0.06] bg-[#0a1020]">
          <div className="shell py-20 lg:py-28">
            <p className="text-sm font-bold tracking-[0.14em] text-[#a3b8ff] uppercase">Resume examples</p>
            <h2 className="reveal mt-4 max-w-4xl font-serif text-[clamp(2.46rem,4.6vw,4.48rem)] leading-[1.04] font-normal tracking-[-0.015em] text-slate-900">Examples written for <em className="text-brand-600 italic">your country&rsquo;s rules.</em></h2>
            <p className="reveal mt-5 max-w-2xl text-lg text-slate-600" style={delay(100)}>Fictional résumés and CVs for popular jobs in six countries, each with local qualifications, the right paper size and a writing guide.</p>
            <div className="mt-10">
              <HomeExamples initial={{ format: formatFor("us"), samples: featured("us") }} categories={visibleCategories().map((c) => ({ slug: c.slug, name: c.name }))} roleNames={Object.fromEntries(publishedRoles().map((r) => [r.slug, r.name]))} />
            </div>
          </div>
        </section>

        {/* Interview practice */}
        <section id="practice" className="relative scroll-mt-20 overflow-hidden bg-[#070b16] text-white">
          <BgFx beam={false} />
          <div aria-hidden className="pointer-events-none absolute -bottom-[18rem] -left-[10rem] size-[40rem] rounded-full border border-[#8457ff]/20" />
          <div className="shell relative grid items-center gap-14 py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-28">
            <div>
              <p className="text-sm font-bold tracking-[0.14em] text-[#a3b8ff] uppercase">Interview practice</p>
              <h2 className="reveal mt-4 font-serif text-[clamp(2.46rem,4.6vw,4.48rem)] leading-[1.04] font-normal tracking-[-0.015em]">Walk in having <em className="text-[#a3b8ff] italic">already practised.</em></h2>
              <p className="reveal mt-5 max-w-xl text-lg text-[#b3bbd9]" style={delay(100)}>Study real questions for your role, then test yourself on any skill and see exactly where you stand.</p>
              <div className="mt-9"><PracticeFeatures count={qCount} /></div>
            </div>
            <div className="reveal" style={delay(150)}>
              <PracticeArt />
              <p className="mt-6 text-center text-xs text-[#8b95ba]">Animated sample for illustration.</p>
            </div>
          </div>
        </section>

        {/* Facts */}
        <section className="shell py-20 lg:py-24" aria-label="At a glance">
          <dl className="grid gap-10 sm:grid-cols-3">
            {[
              [<CountUp key="s" to={18} />, "official job sources", "Employer career sites, job boards and remote boards."],
              [<CountUp key="t" to={TEMPLATES.length} />, "résumé templates", "ATS-first and visual, free and Pro, by role and country."],
              ["40+", "countries covered", "Indian corporate, Lebenslauf, Europass, Gulf and more."],
            ].map(([n, l, d], i) => (
              <div key={String(l)} className="reveal border-t border-slate-300 pt-6" style={delay(i * 90)}>
                <dt className="font-serif text-[clamp(3.81rem,6.6vw,6.27rem)] leading-none font-normal tracking-[-0.015em] text-slate-900">{n}</dt>
                <dd className="mt-3"><span className="block text-lg font-bold text-slate-900">{l}</span><span className="mt-1 block text-[15px] text-slate-600">{d}</span></dd>
              </div>
            ))}
          </dl>
        </section>

        <FeatureShowcase />

        {/* Personas */}
        <section className="shell py-20 lg:py-28">
          <h2 className="reveal max-w-4xl font-serif text-[clamp(2.69rem,5.28vw,5.15rem)] leading-[1.03] font-normal tracking-[-0.015em] text-slate-900">Whether it&rsquo;s your first résumé or your fifth career move.</h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PERSONAS.map((p, i) => (
              <article key={p.who} className="reveal group relative aspect-[3/4] overflow-hidden rounded-[1.4rem] bg-[#10152b]" style={delay(i * 90)}>
                <Photo name={p.photo} alt={p.alt} position={p.pos} sizes="(min-width: 1280px) 36vw, (min-width: 640px) 70vw, 100vw" className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#10152b] via-[#10152b]/55 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                  <h3 className="font-serif text-3xl leading-tight">{p.who}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#e6e9f6]">{p.line}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Method */}
        <section id="method" className="scroll-mt-20 border-y border-white/[0.06] bg-[#0a1020]">
          <div className="shell py-20 lg:py-28">
            <h2 className="reveal max-w-4xl font-serif text-[clamp(2.69rem,5.28vw,5.15rem)] leading-[1.03] font-normal tracking-[-0.015em] text-slate-900">From résumé to offer-ready, in four moves.</h2>
            <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.n} className="reveal border-t-2 border-slate-900 pt-5" style={delay(i * 90)}>
                  <span className="font-serif text-7xl leading-none text-brand-600">{s.n}</span>
                  <h3 className="mt-5 text-xl font-extrabold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section className="shell grid items-center gap-14 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-24 lg:py-28">
          <div className="reveal relative">
            <Photo name="team" alt="Colleagues talking around a table in a bright office" sizes="(min-width: 1024px) 60vw, 100vw" position="50% 40%" className="relative aspect-[4/3.4] rounded-[1.6rem]" />
            <div aria-hidden className="absolute -right-4 -bottom-4 -z-10 size-40 rounded-full bg-[#ffc857]" />
            <div aria-hidden className="absolute -top-4 -left-4 -z-10 size-24 rounded-full bg-[#8457ff]" />
          </div>
          <div>
            <h2 className="reveal font-serif text-[clamp(2.69rem,4.84vw,4.7rem)] leading-[1.03] font-normal tracking-[-0.015em] text-slate-900">Honest by design.</h2>
            <ul className="mt-9 space-y-7">
              {PRINCIPLES.map(([Icon, t, d], i) => (
                <li key={t} className="reveal flex gap-5 border-t border-slate-300 pt-6" style={delay(i * 90)}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#10152b] text-white"><Icon className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">{t}</h3>
                    <p className="mt-1.5 text-base leading-relaxed text-slate-600">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-[#070b16] text-white">
          <BgFx />
          <div className="shell relative grid items-center gap-10 py-20 lg:grid-cols-[1fr_2fr_1fr] lg:py-28">
            <Photo name="portrait-lena" alt="A smiling professional in a striped cardigan" sizes="(min-width: 1024px) 32vw, 90vw" position="50% 20%" className="relative mx-auto hidden aspect-[3/4] w-full max-w-[17rem] rounded-t-[999px] rounded-b-[1.4rem] lg:block" />
            <div className="reveal text-center">
              <h2 className="font-serif text-[clamp(2.91rem,5.72vw,5.6rem)] leading-[1.02] font-normal tracking-[-0.015em]">Two minutes from now, you&rsquo;ll have <em className="text-[#a3b8ff] italic">a shortlist.</em></h2>
              <p className="mx-auto mt-6 max-w-xl text-lg text-[#d5daee]">Upload your résumé and see your ranked matches, gaps and apply links before your coffee cools.</p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                <Link href={start} className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#10152b] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">Build My Resume <ArrowRight className="size-4" aria-hidden /></Link>
                {!user && <DemoButton className="text-base font-bold text-white underline decoration-white/60 decoration-2 underline-offset-[6px] hover:decoration-white">Try the demo</DemoButton>}
              </div>
            </div>
            <Photo name="portrait-sara" alt="A professional laughing" sizes="(min-width: 1024px) 32vw, 90vw" position="50% 25%" className="relative mx-auto hidden aspect-[3/4] w-full max-w-[17rem] rounded-t-[999px] rounded-b-[1.4rem] lg:block" />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#05070f] text-[#d5daee]">
        <div className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Image src="/brand/mark.png" alt="" width={28} height={28} unoptimized className="size-7" />
              <span className="font-display text-xl text-white">CareerMatch</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#aab3d1]">An AI career platform for India and the world. Jobs from authorised sources, always shown with attribution.</p>
          </div>
          <nav aria-label="Product">
            <p className="text-sm font-bold text-white">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/pricing" className="transition hover:text-white">Pricing</Link></li>
              <li><Link href="/signup" className="transition hover:text-white">Get started</Link></li>
              <li><Link href="/login" className="transition hover:text-white">Sign in</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <p className="text-sm font-bold text-white">Legal</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {LEGAL_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="transition hover:text-white">{l.short}</Link></li>)}
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="shell flex flex-col gap-2 py-5 text-xs text-[#8691b5] sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} CareerMatch AI</span>
            <span>Photographs from Unsplash, used under the Unsplash licence.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
