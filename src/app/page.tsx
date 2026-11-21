import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoButton } from "@/components/client";
import { HomeFeatures } from "@/components/home-features";
import { HomeSlider, type Slide } from "@/components/home-slider";
import { JsonLd, organization, softwareApplication } from "@/components/json-ld";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { appUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: { absolute: "CareerMatch: jobs ranked against your résumé" },
  description: "Upload your résumé and see jobs from employer career sites across India ranked for you. Every score is computed from the complete job description, with the skills you have and the ones you're missing. Free to start.",
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "CareerMatch: jobs ranked against your résumé", description: "Every score is computed from the complete job description, with the skills you have and the ones you're missing." },
};

// Static, refreshed hourly: served from the edge cache, so it loads instantly.
export const revalidate = 3600;

const Arrow = () => (
  <span aria-hidden className="arrow-chip grid size-9 shrink-0 place-items-center rounded-full border border-current">
    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

const Photo = ({ src, alt, className = "", position = "50% 30%", sizes, priority }: { src: string; alt: string; className?: string; position?: string; sizes: string; priority?: boolean }) => (
  <div className={`${/\babsolute\b/.test(className) ? "" : "relative "}overflow-hidden ${className}`}>
    <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={90} className="zoom-img object-cover" style={{ objectPosition: position }} />
  </div>
);

const OFFER: { title: string; body: string; tone: string; card: React.ReactNode }[] = [
  {
    title: "Matches",
    body: "Live jobs from employer career sites, ranked against your résumé, with the reason for every score.",
    tone: "bg-peri",
    card: (
      <div className="mx-auto w-56 rounded-2xl bg-white p-4 text-center text-forest-deep shadow-[0_18px_40px_-20px_rgb(7_33_26/0.5)]">
        <p className="serif-display text-xl">Ananya R.</p>
        <Photo src="/people/persona-early.jpg" alt="" sizes="192px" className="mx-auto mt-3 size-20 rounded-full" position="65% 25%" />
        <p className="mt-3 text-xs text-forest/70">Senior Data Analyst · Bengaluru</p>
        <p className="mt-2 inline-block rounded-full bg-mintwash px-3 py-1 text-xs font-semibold text-forest">82 match · 9 of 11 skills</p>
      </div>
    ),
  },
  {
    title: "Résumé and cover letter",
    body: "Tailor your résumé to one posting. Each rewrite comes with its reason, and you approve it line by line.",
    tone: "bg-leaf",
    card: (
      <div className="mx-auto w-56 rounded-2xl border border-white/25 bg-white/10 p-4 text-white backdrop-blur-sm">
        <p className="text-sm font-semibold">Before → after</p>
        <div className="mt-3 space-y-2 text-xs">
          <p className="rounded-lg bg-white/10 p-2 line-through decoration-white/50">Handled vendor reports</p>
          <p className="rounded-lg bg-white/20 p-2">Built weekly vendor reports in Power BI for 40 suppliers</p>
        </div>
        <p className="mt-3 text-xs text-white/80">ATS alignment 61 → 84</p>
      </div>
    ),
  },
  {
    title: "Interview practice",
    body: "Questions asked for your role, and a skills test that shows exactly where you'd lose marks.",
    tone: "bg-apricot",
    card: (
      <div className="mx-auto w-56 rounded-2xl bg-white p-4 text-forest-deep shadow-[0_18px_40px_-20px_rgb(7_33_26/0.5)]">
        <div className="flex items-center gap-3">
          <Photo src="/people/portrait-emma.jpg" alt="" sizes="96px" className="size-10 rounded-full" position="50% 20%" />
          <div><p className="text-sm font-semibold">Mock interview</p><p className="text-xs text-forest/70">Question 3 of 5</p></div>
        </div>
        <p className="mt-3 rounded-lg bg-cream p-2 text-xs">&ldquo;Tell me about a time you cut costs without losing quality.&rdquo;</p>
        <p className="mt-2 text-xs font-semibold text-leaf">Strong answer · add one number</p>
      </div>
    ),
  },
];

const STEPS: { word: string; title: string; body: string }[] = [
  { word: "Match", title: "Every posting, read in full", body: "We load each job's complete description from the employer's own site before anything is scored, then rank it against your résumé on skills, role, seniority, location and pay." },
  { word: "Tailor", title: "Your résumé, aimed at one job", body: "See which requirements you meet, with your own lines as evidence. Accept the rewrites you agree with; nothing is added that isn't true." },
  { word: "Apply", title: "Straight to the employer", body: "Apply on the company's own posting, track every application on one board, and get a reminder when it's time to follow up." },
];

const PEOPLE: { photo: string; alt: string; pos: string; who: string; line: string }[] = [
  { photo: "/people/persona-grad.jpg", alt: "A smiling graduate in a cap and gown", pos: "55% 30%", who: "Graduating students", line: "Turn a degree and a few projects into a résumé recruiters read." },
  { photo: "/people/persona-early.jpg", alt: "A young professional smiling at his laptop", pos: "68% 30%", who: "Early in your career", line: "Show what you did in your first roles and find the step up." },
  { photo: "/people/persona-senior.jpg", alt: "A professional in a blue suit at his desk", pos: "50% 28%", who: "Experienced professionals", line: "Aim years of experience at each role without diluting it." },
  { photo: "/people/persona-switch.jpg", alt: "A woman with curly hair and glasses in a bright office", pos: "76% 35%", who: "Changing careers", line: "Reframe what you've already done for a new field, honestly." },
];

const SLIDES: Slide[] = [
  { label: "Upload", title: "Start with the résumé you have", body: "PDF, Word or LinkedIn export. It becomes a clean profile you can edit in minutes.", photo: "/people/laptop-cafe.jpg", alt: "A woman working on her laptop in a café", position: "50% 40%" },
  { label: "Read the score", title: "Know why a job scored 82", body: "Skills you have in green, gaps in red, and the experience the employer asks for against yours.", photo: "/people/portrait-marcus.jpg", alt: "A man in a suit, arms crossed, smiling", position: "50% 25%" },
  { label: "Prepare", title: "Walk in having practised", body: "Real questions for your role, feedback on each answer, and a skills test before the interview.", photo: "/people/team.jpg", alt: "Colleagues talking around a table", position: "50% 40%" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-forest-deep">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [organization(), { "@type": "WebSite", "@id": `${appUrl()}/#site`, name: "CareerMatch AI", url: `${appUrl()}/`, inLanguage: "en-IN", publisher: { "@id": `${appUrl()}/#org` } }, softwareApplication()],
        }}
      />
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="bg-forest text-white">
          <div className="shell grid lg:grid-cols-2">
            <div className="intro py-16 pr-0 lg:border-r lg:border-white/15 lg:py-24 lg:pr-14">
              <h1 className="serif-display text-[clamp(3rem,6.4vw,6rem)] leading-[0.98]">Your next job.<br />Matched.</h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-white/80">
                Upload your résumé once. CareerMatch reads every job description in full, ranks live jobs from employer career sites across India against you, and shows why each one scored the way it did.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Link href="/signup" className="btn rounded-full bg-leaf-bright px-7 py-3.5 text-base text-forest-deep hover:bg-white">Upload your résumé</Link>
                <DemoButton className="text-base font-semibold text-white underline decoration-white/50 underline-offset-[6px] hover:decoration-white">Try it with a sample résumé</DemoButton>
              </div>
              <p className="mt-5 text-sm text-white/55">Free to start, no card needed.</p>
            </div>
            {/* Photo and floating cards never overlap: cards sit in the green space (desktop) or below the photo (phones). */}
            <div className="pb-14 lg:relative lg:pb-0">
              <div className="intro-late relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-t-[999px] sm:max-w-md lg:absolute lg:top-14 lg:right-4 lg:bottom-0 lg:left-[36%] lg:mx-0 lg:aspect-auto lg:w-auto lg:max-w-none">
                <Image src="/people/hero-main.jpg" alt="A smiling professional at her desk" fill priority quality={90} sizes="(min-width: 1024px) 70vw, 150vw" className="photo-settle object-cover" style={{ objectPosition: "50% 22%" }} />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:mt-0">
                <div className="bob w-52 rounded-2xl bg-white p-4 text-forest-deep shadow-[0_24px_50px_-24px_rgb(0_0_0/0.6)] lg:absolute lg:top-[28%] lg:left-0">
                  <p className="text-xs text-forest/60">Procurement Analyst · Hyderabad</p>
                  <p className="mt-1 flex items-baseline gap-2"><span className="text-3xl font-bold tabular-nums">82</span><span className="text-sm text-forest/60">match</span></p>
                  <div className="mt-2 flex gap-1.5 text-[11px]"><span className="rounded-full bg-mintwash px-2 py-0.5 font-semibold text-forest">SAP Ariba</span><span className="rounded-full bg-mintwash px-2 py-0.5 font-semibold text-forest">Sourcing</span></div>
                </div>
                <div className="bob-late flex items-center gap-3 rounded-full bg-peri py-2 pr-4 pl-2 text-forest-deep shadow-[0_24px_50px_-24px_rgb(0_0_0/0.6)] lg:absolute lg:bottom-12 lg:left-0">
                  <Photo src="/people/portrait-sara.jpg" alt="" sizes="96px" className="size-9 rounded-full" position="50% 25%" />
                  <span className="text-sm font-semibold">Interview booked</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="bg-mintwash">
          <div className="shell py-20 lg:py-24">
            <h2 className="reveal serif-display text-[clamp(2.4rem,4.4vw,4rem)] leading-tight">What you get</h2>
            <div className="reveal-stagger mt-12 grid gap-8 md:grid-cols-3 lg:gap-10">
              {OFFER.map((o) => (
                <Link key={o.title} href="/signup" className="group flex flex-col bg-mintwash">
                  <div className={`${o.tone} grid h-72 place-items-center overflow-hidden rounded-3xl p-6`}>{o.card}</div>
                  <div className="mt-6 flex flex-1 items-start justify-between gap-4 border-t border-forest/20 pt-6">
                    <div>
                      <h3 className="serif-display text-3xl">{o.title}</h3>
                      <p className="mt-2 max-w-xs leading-7 text-forest/75">{o.body}</p>
                    </div>
                    <Arrow />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Statement */}
        <section className="bg-forest-deep text-white">
          <div className="shell py-20 lg:py-28">
            <p className="reveal serif-display max-w-5xl text-[clamp(1.9rem,3.6vw,3.3rem)] leading-[1.15] text-white/90">
              Most job sites show you a list. CareerMatch reads every posting in full, checks it against what you&rsquo;ve actually done, and tells you plainly where you stand.
            </p>
          </div>
        </section>

        {/* Match / Tailor / Apply: words light up as their step scrolls past */}
        <section id="how" className="steps-scope scroll-mt-20 bg-mintsoft">
          <div className="shell grid gap-10 py-20 lg:grid-cols-2 lg:gap-0 lg:py-0">
            <div className="lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100vh-68px)] lg:flex-col lg:justify-center lg:pr-14">
              {STEPS.map((s, k) => (
                <p key={s.word} className={`word word-${k + 1} serif-display text-[clamp(3.2rem,7vw,6.5rem)] leading-[1.02] text-forest-deep`}>{s.word}</p>
              ))}
              <Link href="/signup" className="mt-10 inline-flex w-fit items-center rounded-full border border-forest-deep px-5 py-2.5 text-sm font-semibold hover:bg-forest-deep hover:text-white">Start with your résumé</Link>
            </div>
            <div className="relative lg:border-l lg:border-forest/15">
              <span aria-hidden className="grow-line absolute top-0 -left-px hidden h-full w-0.5 bg-leaf lg:block" />
              {STEPS.map((s, k) => (
                <div key={s.word} className={`step-${k + 1} flex flex-col justify-center py-10 lg:min-h-[85vh] lg:py-0 lg:pl-14`}>
                  <p className="text-sm font-semibold text-leaf">{s.word}</p>
                  <h3 className="mt-3 serif-display text-[clamp(2rem,3.2vw,3rem)] leading-tight">{s.title}</h3>
                  <p className="mt-4 max-w-md text-lg leading-8 text-forest/75">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <HomeFeatures />

        {/* Who it's for */}
        <section id="who" className="scroll-mt-20 bg-cream">
          <div className="shell py-20 lg:py-24">
            <h2 className="reveal serif-display max-w-3xl text-[clamp(2.4rem,4.4vw,4rem)] leading-tight">Whether it&rsquo;s your first résumé or your fifth career move</h2>
            <div className="reveal-stagger mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {PEOPLE.map((p) => (
                <article key={p.who} className="group relative aspect-[3/4] overflow-hidden rounded-3xl bg-forest">
                  <Photo src={p.photo} alt={p.alt} position={p.pos} sizes="(min-width: 1280px) 40vw, (min-width: 640px) 75vw, 150vw" className="absolute inset-0" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <h3 className="serif-display text-3xl leading-tight">{p.who}</h3>
                    <p className="mt-2 leading-6 text-white/85">{p.line}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-6 text-xs text-forest/55">Portraits are licensed stock photographs, not customers. Cards above use sample data.</p>
          </div>
        </section>

        {/* How it works slider */}
        <section className="bg-white">
          <div className="shell py-20 lg:py-24">
            <h2 className="reveal serif-display max-w-3xl text-[clamp(2.4rem,4.4vw,4rem)] leading-tight">From résumé to interview</h2>
            <div className="reveal mt-12"><HomeSlider slides={SLIDES} /></div>
          </div>
        </section>

        {/* Closing calls to action */}
        <section className="grid bg-cream md:grid-cols-2">
          <div className="group flex flex-col justify-between gap-10 border-b border-forest/10 p-10 sm:p-14 md:border-r md:border-b-0 lg:p-20">
            <div>
              <h2 className="serif-display text-[clamp(2rem,3.4vw,3.2rem)] leading-tight">Find the right job</h2>
              <p className="mt-4 max-w-md text-lg leading-8 text-forest/75">See live roles ranked for you, with the skills you have and the ones you&rsquo;re missing.</p>
            </div>
            <div className="flex items-end justify-between gap-6">
              <Link href="/signup" className="btn rounded-full bg-leaf px-6 py-3 text-base text-white hover:bg-forest">Upload your résumé</Link>
              <Photo src="/people/portrait-lena.jpg" alt="A smiling professional in a striped cardigan" sizes="320px" className="hidden size-36 rounded-full sm:block" position="50% 20%" />
            </div>
          </div>
          <div className="group flex flex-col justify-between gap-10 p-10 sm:p-14 lg:p-20">
            <div>
              <h2 className="serif-display text-[clamp(2rem,3.4vw,3.2rem)] leading-tight">See it with a sample résumé</h2>
              <p className="mt-4 max-w-md text-lg leading-8 text-forest/75">Explore matches, scores and the résumé studio with a fictional profile. Nothing to upload.</p>
            </div>
            <div className="flex items-end justify-between gap-6">
              <DemoButton className="btn rounded-full border border-forest-deep px-6 py-3 text-base text-forest-deep hover:bg-forest-deep hover:text-white">Try the demo</DemoButton>
              <Photo src="/people/hero-face-a.jpg" alt="A smiling man in a suit" sizes="320px" className="hidden size-36 rounded-full sm:block" position="50% 25%" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
