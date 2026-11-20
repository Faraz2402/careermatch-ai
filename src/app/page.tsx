import type { Metadata } from "next";
import Link from "next/link";
import { DemoButton } from "@/components/client";
import { JsonLd, organization, softwareApplication } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: { absolute: "CareerMatch: jobs ranked against your résumé" },
  description: "Upload your résumé and see jobs from employer career sites across India ranked for you. Every score is computed from the complete job description, with the skills you have and the ones you're missing. Free to start.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "CareerMatch: jobs ranked against your résumé", description: "Every score is computed from the complete job description, with the skills you have and the ones you're missing." },
};

// Static, refreshed hourly: the page is served from the edge cache, so it loads instantly.
export const revalidate = 3600;

/** Live numbers for the sources section; nothing is shown if the database can't be read at build time. */
async function liveNumbers() {
  try {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const where = { lastSeenAt: { gte: since }, descriptionFull: true, expiredAt: null, importedById: null, source: { not: "demo" } };
    const [listings, companies] = await Promise.all([
      db.job.count({ where }),
      db.job.groupBy({ by: ["company"], where, _count: true, orderBy: { _count: { company: "desc" } }, take: 24 }),
    ]);
    return { listings, companies: companies.map((c) => c.company).filter((c) => c && !/not listed|unknown/i.test(c)) };
  } catch {
    return null;
  }
}

// The scoring weights, exactly as src/lib/jobs/rank.ts applies them.
const SCORE_PARTS: [string, string, string][] = [
  ["Skills", "40", "Each skill the posting asks for, checked against your résumé. Required skills count fully, nice-to-haves half."],
  ["Role", "20", "How close the title is to the roles you want. A UI Engineer counts as a frontend role."],
  ["Relevance", "10", "How much the whole description overlaps the work you've described."],
  ["Seniority and experience", "10", "The level in the title, and the years of experience the posting asks for against yours."],
  ["Location and arrangement", "10", "Your cities, and remote, hybrid or on-site."],
  ["Salary", "5", "Posted pay against your minimum. Neutral when no pay is posted."],
  ["Recency", "5", "Newer postings first. Anything past 30 days is flagged."],
  ["Your feedback", "±5", "Jobs like the ones you save rise; jobs like the ones you hide sink."],
];

const TOOLS: [string, string, string][] = [
  ["Matches", "A ranked list of live jobs, each with its score, the skills you're missing and the employer's own apply link.", "/signup"],
  ["Résumé and cover letter", "Tailor your résumé to one posting. Every rewrite is proposed with its reason, and you accept or reject it line by line.", "/signup"],
  ["Interview practice", "Questions asked for your role, and a skills test that shows where you'd lose marks.", "/signup"],
];

/** The hero: one job posting, read in full, marked up the way a recruiter would. Sample content. */
function MarkedPosting() {
  const m = (i: number, text: string) => <mark className="marker mark-in bg-transparent text-inherit" style={{ "--i": i } as React.CSSProperties}>{text}</mark>;
  const gap = (text: string) => <span className="underline decoration-rose-500 decoration-wavy decoration-1 underline-offset-4">{text}</span>;
  return (
    <figure className="card overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <p className="text-lg font-semibold text-slate-900">Senior Data Analyst</p>
          <p className="text-sm text-slate-600">Fintech company, Bengaluru (hybrid)</p>
        </div>
        <div className="text-right">
          <p className="text-4xl leading-none font-bold tracking-tight text-slate-900 tabular-nums">82</p>
          <p className="mt-1 text-xs text-slate-500">of 100</p>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3 p-5 text-[0.93rem] leading-7 text-slate-700">
          <p>You will own reporting for our payments business and work with product and risk teams on how merchants grow.</p>
          <p>
            What you&rsquo;ll need: {m(0, "4+ years in analytics")}, strong {m(1, "SQL")} and {m(2, "Python")}, experience building dashboards in {m(3, "Power BI")} or Tableau, and comfort explaining numbers to people who don&rsquo;t work with them.
          </p>
          <p>Good to have: {gap("dbt")}, {m(4, "A/B testing")}, and an understanding of {gap("credit risk")}.</p>
          <p className="text-slate-500">The full description continues: benefits, team, hiring process…</p>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 p-5 text-sm md:border-t-0 md:border-l">
          <p className="font-semibold text-slate-900">Why 82</p>
          <dl className="stagger mt-3 space-y-2 tabular-nums">
            {[["Skills", 33, 40], ["Role", 18, 20], ["Relevance", 8, 10], ["Seniority and experience", 10, 10], ["Location", 10, 10], ["Salary", 2, 5], ["Recency", 5, 5]].map(([label, got, max]) => (
              <div key={label as string} className="flex justify-between gap-3">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-medium text-slate-900">{got}/{max}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-slate-600"><span className="marker">Highlighted</span>: on your résumé. <span className="underline decoration-rose-500 decoration-wavy decoration-1 underline-offset-4">Underlined</span>: missing.</p>
        </div>
      </div>
      <figcaption className="border-t border-slate-200 px-5 py-2.5 text-xs text-slate-500">Sample posting and résumé, for illustration.</figcaption>
    </figure>
  );
}

export default async function Landing() {
  const live = await liveNumbers();

  return (
    <div className="min-h-screen bg-surface">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organization(), { "@type": "WebSite", "@id": `${appUrl()}/#site`, name: "CareerMatch AI", url: `${appUrl()}/`, inLanguage: "en-IN", publisher: { "@id": `${appUrl()}/#org` } }, softwareApplication()],
        }}
      />
      <SiteHeader dark />
      <main id="main">
        <div className="hero-night">
          <div aria-hidden className="hero-grid" />
          <section className="shell grid items-center gap-12 pt-[124px] pb-20 lg:grid-cols-[1fr_1.15fr] lg:pt-[150px] lg:pb-28">
            <div className="parallax-text">
              <div className="intro max-w-xl">
                <h1 className="text-[clamp(2.5rem,4.8vw,4.1rem)] leading-[1.03] font-bold text-white">Jobs ranked against your résumé, read from the whole posting.</h1>
                <p className="mt-6 text-lg leading-8 text-white/70">
                  Upload your résumé once. CareerMatch reads every job description in full, marks what you already have and what you&rsquo;re missing, and shows you why each job scored the way it did.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link href="/signup" className="btn bg-[#ffe36e] px-6 py-3 text-base text-[#0b1524] shadow-[0_10px_30px_-10px_rgb(255_227_110/0.6)] hover:bg-[#ffd84a]">Upload your résumé</Link>
                  <DemoButton className="btn border border-white/20 px-6 py-3 text-base text-white hover:border-white/40 hover:bg-white/5">Try it with a sample résumé</DemoButton>
                </div>
                <p className="mt-4 text-sm text-white/50">Free to start, no card needed.</p>
              </div>
            </div>
            <div className="parallax-card">
              <div className="intro-late float-card rounded-xl"><MarkedPosting /></div>
            </div>
          </section>
        </div>

        <section id="sources" className="scroll-mt-16 border-y border-slate-200 bg-slate-50">
          <div className="reveal shell grid gap-8 py-12 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Where the jobs come from</h2>
              <p className="mt-3 text-slate-600">
                Straight from employers&rsquo; own career sites (Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Oracle and SuccessFactors) plus Adzuna, Jooble and remote-job boards. Listings are checked every few hours and drop out when the employer takes them down.
              </p>
            </div>
            <div>
              {live && live.listings > 0 && (
                <p className="text-slate-900">
                  <span className="text-4xl font-bold tracking-tight tabular-nums">{live.listings.toLocaleString("en-IN")}</span>
                  <span className="ml-2 text-slate-600">live jobs with their complete description, this week</span>
                </p>
              )}
              {live && live.companies.length > 0 && (
                <div className="marquee mt-6" aria-label="Employers hiring now">
                  <ul className="marquee-track">
                    {[...live.companies, ...live.companies].map((c, i) => (
                      <li key={i} aria-hidden={i >= live.companies.length || undefined} className="shrink-0 pr-10 text-xl font-semibold whitespace-nowrap text-slate-400 transition-colors hover:text-slate-900">{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="scoring" className="shell scroll-mt-16 py-16 lg:py-20">
          <div className="reveal grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">How the score works</h2>
              <p className="mt-4 text-slate-600">
                Out of 100, from fixed rules you can see on every job. The complete description is loaded before anything is scored; a job whose full text hasn&rsquo;t loaded yet is labelled as an estimate.
              </p>
            </div>
            <table className="w-full text-left">
              <caption className="sr-only">Points in the match score</caption>
              <thead>
                <tr className="border-b border-slate-300 text-sm text-slate-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Part</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Points</th>
                  <th scope="col" className="hidden py-2 font-medium sm:table-cell">What it measures</th>
                </tr>
              </thead>
              <tbody className="reveal-stagger divide-y divide-slate-200">
                {SCORE_PARTS.map(([part, pts, what]) => (
                  <tr key={part} className="align-top">
                    <th scope="row" className="py-3 pr-4 font-semibold text-slate-900">
                      {part}
                      <span className="mt-1 block text-sm font-normal text-slate-600 sm:hidden">{what}</span>
                    </th>
                    <td className="py-3 pr-4 text-right text-lg font-semibold text-slate-900 tabular-nums">{pts}</td>
                    <td className="hidden py-3 text-slate-600 sm:table-cell">{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-slate-200">
          <div className="reveal-stagger shell grid gap-10 py-16 md:grid-cols-3">
            {TOOLS.map(([title, body, href]) => (
              <div key={title}>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{body}</p>
                <Link href={href} className="mt-3 inline-block font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-700">Start with your résumé</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[#18212e] text-white">
          <div className="reveal shell flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold">Nothing invented, nothing sold.</h2>
              <p className="mt-3 text-white/75">Suggestions only use experience that&rsquo;s already on your résumé. No jobs are read from behind logins. Your résumé is encrypted, never sold, and you can delete your account and data at any time.</p>
            </div>
            <Link href="/signup" className="btn bg-[#ffe36e] px-5 py-3 text-base text-[#18212e] hover:bg-[#ffd84a]">Upload your résumé</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
