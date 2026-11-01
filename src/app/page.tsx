import Image from "next/image";
import Link from "next/link";
import { DemoButton } from "@/components/client";
import { JsonLd, organization, softwareApplication } from "@/components/json-ld";
import { FeatureShowcase } from "@/components/feature-showcase";
import { LandingFx } from "@/components/landing-fx";
import { LandingNav } from "@/components/landing-nav";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { appUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: { absolute: "CareerMatch AI: AI Résumé Builder & Job Matching for India" },
  description: "Upload your résumé and get jobs ranked for you across India and worldwide: match scores with reasons, skill gaps, employer apply links, salaries in ₹, and AI-tailored résumés and cover letters. Free to start.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "CareerMatch AI: your next role, found, not searched for", description: "Upload your résumé and get jobs ranked for you across India and worldwide: match scores with reasons, skill gaps, employer apply links, salaries in ₹, and AI-tailored résumés and cover letters. Free to start." },
};

type SourceKind = "employer" | "board" | "remote";

// Employer career-site platforms first, then job boards, then remote-job boards.
const SOURCES: { name: string; kind: SourceKind }[] = [
  ...["Greenhouse", "Lever", "Ashby", "SmartRecruiters", "Workable", "SuccessFactors", "Oracle"].map((name) => ({ name, kind: "employer" as const })),
  ...["Adzuna", "Jooble"].map((name) => ({ name, kind: "board" as const })),
  ...["We Work Remotely", "Remote OK", "Himalayas", "Jobicy", "Remotive", "Working Nomads", "Findwork", "Real Work From Anywhere"].map((name) => ({ name, kind: "remote" as const })),
];

const DOT: Record<SourceKind, string> = {
  employer: "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]",
  board: "bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.9)]",
  remote: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]",
};

const SourceDot = ({ kind }: { kind: SourceKind }) => <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${DOT[kind]}`} />;

const STEPS = [
  { n: "01", title: "Drop in your résumé", body: "PDF, DOCX or plain text. AI turns it into a clean, editable profile in seconds." },
  { n: "02", title: "Tell us what you want", body: "Roles, cities, salary floor, work style. Every country, every major Indian city." },
  { n: "03", title: "Read the shortlist", body: "Fresh roles ranked against you, each with its score, its gaps and its real apply link." },
  { n: "04", title: "Apply like an insider", body: "A tailored ATS résumé, cover letter and talking points for every role you choose." },
];

function Ring({ value }: { value: number }) {
  const c = 2 * Math.PI * 26;
  return (
    <svg width="68" height="68" viewBox="0 0 64 64" role="img" aria-label={`Match score ${value}`} className="shrink-0">
      <defs>
        <linearGradient id="lux-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="26" fill="none" stroke="#27272a" strokeWidth="4" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#lux-ring)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="600">{value}</text>
    </svg>
  );
}

const Chip = ({ ok, children }: { ok?: boolean; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${ok ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300" : "border-rose-400/20 bg-rose-400/[0.07] text-rose-300"}`}>
    {ok ? "✓" : "✗"} {children}
  </span>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-medium tracking-[0.18em] text-[#a1a1aa] uppercase">{children}</p>
);

export default async function Landing() {
  const user = await getCurrentUser();
  const start = user ? "/onboarding" : "/signup";

  return (
    <div className="lux relative min-h-screen overflow-x-clip">
      <LandingFx />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organization(), { "@type": "WebSite", "@id": `${appUrl()}/#site`, name: "CareerMatch AI", url: `${appUrl()}/`, inLanguage: "en-IN", publisher: { "@id": `${appUrl()}/#org` } }, softwareApplication()],
        }}
      />

      {/* Ambient light */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] overflow-hidden">
        <div className="lux-aurora absolute -top-64 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.16),rgba(8,145,178,0.05)_55%,transparent)] blur-xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,#050505_85%)]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="CareerMatch AI home">
            <Image src="/brand/mark.png" alt="" width={32} height={32} priority unoptimized className="size-8" />
            <span className="lux-serif text-xl">CareerMatch</span>
          </Link>
          <LandingNav className="hidden md:block" />
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-fluid !px-5 !py-2.5">Dashboard <span className="arrow">→</span></Link>
            ) : (
              <>
                <Link href="/login" className="hidden px-3 py-2 text-[15px] text-[#d4d4d8] transition hover:text-white sm:block">Sign in</Link>
                <Link href="/signup" className="btn-fluid !px-5 !py-2.5">Get started <span className="arrow">→</span></Link>
              </>
            )}
          </div>
        </div>
        <LandingNav className="flex justify-center px-4 pb-3 md:hidden" />
      </header>

      <main id="main" className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl gap-14 px-4 pt-20 pb-24 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pt-28 lg:pb-32">
          <div className="lg:col-span-7">
            <div className="reveal-now inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-[#d4d4d8] backdrop-blur">
              <span className="size-1.5 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
              Career intelligence for India and the world
            </div>
            <h1 className="reveal-now lux-serif mt-7 text-[2.9rem] leading-[1.02] sm:text-7xl lg:text-[5.6rem]" style={{ "--delay": "80ms" } as React.CSSProperties}>
              Your next role,
              <br />
              <em className="lux-sheen not-italic sm:italic">found</em>, not searched for.
            </h1>
            <p className="reveal-now mt-7 max-w-xl text-base leading-relaxed text-[#d4d4d8] sm:text-lg" style={{ "--delay": "160ms" } as React.CSSProperties}>
              CareerMatch reads your résumé, scores every fresh opening against it, finds the employer&rsquo;s own posting, and drafts the
              application. Honest about the gaps. Done in minutes.
            </p>
            <div className="reveal-now mt-10 flex flex-wrap items-center gap-3" style={{ "--delay": "240ms" } as React.CSSProperties}>
              <Link href={start} className="btn-fluid is-solid">Upload your résumé <span className="arrow">→</span></Link>
              {user ? (
                <Link href="/jobs" className="btn-fluid">Browse your matches</Link>
              ) : (
                <DemoButton className="btn-fluid">Explore the live demo</DemoButton>
              )}
            </div>
            <p className="reveal-now mt-5 text-sm text-[#a1a1aa]" style={{ "--delay": "300ms" } as React.CSSProperties}>
              Free to start. No card. The demo uses a fictional résumé and labelled sample listings.
            </p>
          </div>

          {/* Product glass card */}
          <div className="reveal-now relative lg:col-span-5 lg:pt-10" style={{ "--delay": "200ms" } as React.CSSProperties}>
            <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(closest-side,rgba(139,92,246,0.10),transparent)] blur-xl" />
            <div className="lux-glass relative rounded-[1.75rem] p-6 sm:p-7" data-magnet>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Eyebrow>Example match</Eyebrow>
                  <p className="mt-2 text-lg font-semibold tracking-tight">Senior Procurement Analyst</p>
                  <p className="mt-1 text-base text-[#d4d4d8]">Bengaluru · Hybrid · posted today</p>
                </div>
                <Ring value={86} />
              </div>
              <div className="mt-6 flex flex-wrap gap-1.5">
                <Chip ok>SAP Ariba</Chip>
                <Chip ok>P2P</Chip>
                <Chip ok>Spend analysis</Chip>
                <Chip ok>Power BI</Chip>
                <Chip>Coupa</Chip>
                <Chip>SOX controls</Chip>
              </div>
              <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-black/30 text-center">
                {[["Low", "₹14 LPA"], ["Typical", "₹19 LPA"], ["High", "₹26 LPA"]].map(([k, v]) => (
                  <div key={k} className="px-2 py-3">
                    <p className="text-xs tracking-wider text-[#a1a1aa] uppercase">{k}</p>
                    <p className="mt-1 text-base font-semibold">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                <span className="text-sm text-[#a1a1aa]">Original posting, verified</span>
                <span className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-black">Apply on careers.company.com ↗</span>
              </div>
            </div>
            <div className="lux-glass absolute -bottom-6 -left-4 hidden rounded-2xl px-4 py-3 text-sm sm:block">
              <span className="text-[#a1a1aa]">Also posted on</span> <span className="ml-1 font-medium">LinkedIn · Naukri</span>
            </div>
          </div>
        </section>

        {/* Sources strip */}
        <section className="border-y border-[#27272a]" aria-label="Job sources">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-8 md:flex-row md:items-center md:gap-10">
            <div className="shrink-0 space-y-2">
              <p className="text-sm text-[#d4d4d8]">Listings from official APIs and employer feeds</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a1a1aa]">
                <span className="inline-flex items-center gap-1.5"><SourceDot kind="employer" /> Employer career sites</span>
                <span className="inline-flex items-center gap-1.5"><SourceDot kind="board" /> Job boards</span>
                <span className="inline-flex items-center gap-1.5"><SourceDot kind="remote" /> Remote boards</span>
              </p>
            </div>
            {/* One line at every width: the list glides sideways (paused on hover); the copy after it makes the loop seamless. */}
            <div className="lux-marquee min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_7%,#000_93%,transparent)]">
              <ul className="lux-marquee-track flex w-max">
                {[...SOURCES, ...SOURCES].map((s, i) => (
                  <li key={i} aria-hidden={i >= SOURCES.length || undefined} className="pr-3">
                    <span className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-white/[0.015] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-colors duration-300 hover:border-white/25">
                      <SourceDot kind={s.kind} />
                      <span className="lux-serif text-[17px] leading-none text-white/90">{s.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Bento */}
        <section id="product" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-28 sm:px-8 lg:py-36">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Eyebrow>The product</Eyebrow>
              <h2 className="reveal lux-serif mt-4 text-4xl leading-[1.05] sm:text-6xl">
                Less scrolling.
                <br />
                <span className="text-[#a1a1aa] italic">More signal.</span>
              </h2>
            </div>
            <p className="reveal self-end text-[#d4d4d8] lg:col-span-5 lg:col-start-8" style={{ "--delay": "120ms" } as React.CSSProperties}>
              Every listing is read, scored and traced back to its source before it reaches you, so the time you spend goes on applications that can land.
            </p>
          </div>

          <div className="mt-16 grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
            {/* Explainable score */}
            <article className="bento reveal p-7 md:col-span-4 md:row-span-2" data-magnet>
              <Eyebrow>Explainable matching</Eyebrow>
              <h3 className="lux-serif mt-3 text-3xl sm:text-4xl">Every score shows its working.</h3>
              <p className="mt-3 max-w-md text-base text-[#d4d4d8]">Skills, role, seniority, location, pay and freshness, each weighed, explained and colour-coded. No black-box numbers.</p>
              <div className="mt-8 space-y-3.5">
                {[["Skills", 34, 40, "from-emerald-400 to-teal-300"], ["Role & title", 17, 20, "from-emerald-400 to-teal-300"], ["Seniority", 10, 10, "from-emerald-400 to-teal-300"], ["Location", 6, 10, "from-amber-400 to-orange-300"], ["Recency", 5, 5, "from-emerald-400 to-teal-300"]].map(([label, pts, max, g]) => (
                  <div key={String(label)} className="grid grid-cols-[110px_1fr_44px] items-center gap-4 text-base">
                    <span className="text-[#d4d4d8]">{label}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <span className={`block h-full rounded-full bg-gradient-to-r ${g}`} style={{ width: `${(Number(pts) / Number(max)) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums text-white/90">{pts}/{max}</span>
                  </div>
                ))}
              </div>
            </article>

            {/* Source links */}
            <article className="bento reveal p-7 md:col-span-2" data-magnet style={{ "--delay": "80ms" } as React.CSSProperties}>
              <Eyebrow>Straight to the source</Eyebrow>
              <h3 className="lux-serif mt-3 text-2xl">Skip the middlemen.</h3>
              <p className="mt-2 text-base text-[#d4d4d8]">We find the employer&rsquo;s own posting, verify it, and link you there, plus LinkedIn and Naukri when it&rsquo;s live.</p>
              <div className="mt-5 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-white px-2.5 py-1 font-medium text-black">Workday ↗</span>
                <span className="rounded-full border border-white/15 px-2.5 py-1">LinkedIn ↗</span>
                <span className="rounded-full border border-white/15 px-2.5 py-1">Naukri ↗</span>
              </div>
            </article>

            {/* ATS */}
            <article className="bento reveal p-7 md:col-span-2" data-magnet style={{ "--delay": "140ms" } as React.CSSProperties}>
              <Eyebrow>ATS résumé</Eyebrow>
              <h3 className="lux-serif mt-3 text-2xl">Tailored. Never invented.</h3>
              <p className="mt-2 text-base text-[#d4d4d8]">Rewrites mirror each posting&rsquo;s language using only what you&rsquo;ve done. You approve every line, word by word.</p>
            </article>

            {/* Salary */}
            <article className="bento reveal p-7 md:col-span-2" data-magnet>
              <Eyebrow>Market pay</Eyebrow>
              <h3 className="lux-serif mt-3 text-2xl">Know your worth, in ₹.</h3>
              <p className="mt-2 text-base text-[#d4d4d8]">Public salary figures for the same title and city, with a link to every source.</p>
              <p className="lux-serif mt-5 text-4xl">₹19<span className="text-xl text-[#a1a1aa]"> LPA typical</span></p>
            </article>

            {/* Profile */}
            <article className="bento reveal p-7 md:col-span-2" data-magnet style={{ "--delay": "80ms" } as React.CSSProperties}>
              <Eyebrow>Public profile</Eyebrow>
              <h3 className="lux-serif mt-3 text-2xl">A page worth sharing.</h3>
              <p className="mt-2 text-base text-[#d4d4d8]">Your own URL, privacy controls for every section, and one link for recruiters.</p>
            </article>

            {/* Interview */}
            <article className="bento reveal p-7 md:col-span-2" data-magnet style={{ "--delay": "140ms" } as React.CSSProperties}>
              <Eyebrow>Mock interview</Eyebrow>
              <h3 className="lux-serif mt-3 text-2xl">Rehearse before it counts.</h3>
              <p className="mt-2 text-base text-[#d4d4d8]">Five questions built from the role, with feedback after every answer and a closing summary.</p>
            </article>
          </div>
        </section>

        <FeatureShowcase />

        {/* Method */}
        <section id="method" className="scroll-mt-24 border-t border-[#27272a]">
          <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8 lg:py-36">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <Eyebrow>The method</Eyebrow>
                <h2 className="reveal lux-serif mt-4 text-4xl leading-[1.05] sm:text-6xl">From résumé to offer-ready, in four moves.</h2>
              </div>
            </div>
            <ol className="mt-16 grid border-t border-[#27272a] sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  className="reveal border-b border-[#27272a] py-8 sm:px-6 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r lg:first:pl-0"
                  style={{ "--delay": `${i * 90}ms` } as React.CSSProperties}
                >
                  <span className="lux-serif bg-gradient-to-br from-white to-white/30 bg-clip-text text-5xl text-transparent italic">{s.n}</span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[#d4d4d8]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section className="border-t border-[#27272a]">
          <div className="mx-auto max-w-5xl px-4 py-28 text-center sm:px-8 lg:py-36">
            <Eyebrow>Our principles</Eyebrow>
            <p className="reveal lux-serif mt-8 text-3xl leading-[1.2] sm:text-5xl">
              We don&rsquo;t scrape behind logins.
              <br className="hidden sm:block" /> We don&rsquo;t invent your experience.
              <br className="hidden sm:block" /> <span className="text-[#a1a1aa] italic">We don&rsquo;t sell your data.</span>
            </p>
            <p className="reveal mx-auto mt-8 max-w-xl text-base text-[#d4d4d8]" style={{ "--delay": "120ms" } as React.CSSProperties}>
              Every listing shows where it came from and when it was last seen. Every suggestion is grounded in your own résumé.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-28 sm:px-8">
          <div className="reveal lux-glass relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-20 text-center sm:px-12 sm:py-28">
            <div aria-hidden className="lux-aurora pointer-events-none absolute -bottom-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.18),rgba(8,145,178,0.06)_60%,transparent)] blur-xl" />
            <h2 className="lux-serif relative text-4xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Two minutes from now,
              <br />
              <em className="lux-sheen">you&rsquo;ll have a shortlist.</em>
            </h2>
            <p className="relative mx-auto mt-6 max-w-lg text-[#d4d4d8]">Upload your résumé and see your ranked matches, gaps and apply links before your coffee cools.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <Link href={start} className="btn-fluid is-solid">Start free <span className="arrow">→</span></Link>
              {!user && <DemoButton className="btn-fluid">Try the demo</DemoButton>}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#27272a]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#d4d4d8] sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/mark.png" alt="" width={20} height={20} unoptimized className="size-5" />
            <span className="font-medium text-white">CareerMatch AI</span>
            <span className="text-[#a1a1aa]">© {new Date().getFullYear()}</span>
          </div>
          <p className="text-[#a1a1aa]">Jobs from authorised sources, always shown with attribution.</p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms</Link>
            <Link href="/login" className="transition hover:text-white">Sign in</Link>
            <Link href="/signup" className="transition hover:text-white">Get started</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
