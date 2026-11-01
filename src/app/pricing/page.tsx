import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, softwareApplication } from "@/components/json-ld";
import { LandingFx } from "@/components/landing-fx";
import { PaymentMethods } from "@/components/payment-methods";
import { PlanPicker } from "@/components/plan-picker";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { paymentMethods } from "@/lib/billing";
import { LEGAL } from "@/lib/legal";
import { billingConfigured, PLANS, planOf, proPrices } from "@/lib/plans";
import { FREE_TEMPLATE_IDS, TEMPLATES } from "@/lib/templates/catalog";
import { LEGAL_LINKS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Pricing: Free & Pro Plans in ₹",
  description: "CareerMatch AI is free to start. Pro from about ₹14 a day: unlimited résumé and cover-letter exports, job analyses with employer apply links, 400 AI actions a month and a daily job email. UPI, cards and net banking.",
  alternates: { canonical: "/pricing" },
  openGraph: { url: "/pricing", title: "CareerMatch AI pricing: Free & Pro in ₹" },
};

const { free, pro } = PLANS;

/** [feature, what it does for you, Pro, Free] - only features the product really has. */
const n = (v: number | null, unit = "") => (v === null ? "Unlimited" : `${v}${unit}`);
const FEATURES: [string, string, string, string][] = [
  ["AI actions", "Tailored résumés, cover letters, match analyses, gap reports and interview practice.", `${pro.aiActionsPerMonth} / month`, `${free.aiActionsPerMonth} / month`],
  ["Job analyses", "The employer's own apply link, the full job description and market salary in ₹ for a job.", "Unlimited*", n(free.jobAnalysesPerMonth, " / month")],
  ["Make Resume & Cover Letter Studio", "Keyword gap with evidence, every bullet rewritten for the job (you approve each one), the matching cover letter and your before → after ATS estimate.", "Every job", n(free.tailorDrafts, " job")],
  ["Résumé templates", `Original templates for India and 40+ markets: ATS-first and visual designs, country date formats and conventions.`, `All ${TEMPLATES.length}`, `${FREE_TEMPLATE_IDS.length} free`],
  ["Résumé export to PDF & Word", "Selectable-text PDF and editable Word, plus a plain ATS-first version for job portals.", "Unlimited", n(free.resumeExports, " résumé")],
  ["Cover-letter export", "Download cover letters as PDF or Word.", "Unlimited", n(free.coverLetterExports, " cover letter")],
  ["Daily 7 AM job email", "Your best new matches every morning, with scores and skills.", "Included", "—"],
  ["Résumé versions", "A version per role, so every application is on target.", `${pro.resumeVersions}`, `${free.resumeVersions}`],
  ["Saved searches & email alerts", "Get new matches in your inbox, daily or weekly.", `${pro.savedSearches}`, `${free.savedSearches}`],
  ["Job match score", "Every listing scored against your résumé, with the reasons shown.", "Unlimited", "Unlimited"],
  ["Skills check", "Every skill a job asks for, marked green (you have it) or red (missing).", "Unlimited", "Unlimited"],
  ["Jobs feed", "Fresh roles from official job APIs and employer career sites.", "Unlimited", "Unlimited"],
  ["Application tracker", "Track every application, note and follow-up in one board.", "Unlimited", "Unlimited"],
  ["Public profile page", "Your own shareable page with privacy controls.", "Included", "Included"],
];

const FAQ: [string, React.ReactNode][] = [
  ["Is there a free plan?", <>Yes, free forever with no card: {free.aiActionsPerMonth} AI actions and {free.jobAnalysesPerMonth} job analyses a month, one résumé and one cover-letter export, plus the full jobs feed, match scores, skills check and tracker.</>],
  ["Is Pro a subscription?", "No. Pro is a prepaid pass for 1 or 12 months. Nothing renews automatically and nothing is debited without you. Buy again whenever you like to extend."],
  ["What counts as an AI action?", "Each AI-generated item: a tailored résumé, cover letter, match analysis, missing-skills report, talking points or mock interview. Scores, the skills check and exports don't count."],
  ["What is a job analysis?", <>Opening a job for the first time finds the employer&rsquo;s own posting, reads the full description and looks up market salary. Re-opening a job you&rsquo;ve analysed is free, and jobs someone else already analysed cost nothing. *Pro is unlimited within fair use.</>],
  ["What does \"1 export\" mean on Free?", "You can download one tailored résumé and one cover letter as PDF or Word, in any template, as often as you like. To export documents for other jobs, upgrade to Pro."],
  ["Which payment methods work?", "UPI (Google Pay, PhonePe, Paytm, BHIM and any UPI app), debit and credit cards (Visa, Mastercard, RuPay, Amex), net banking and wallets, through Razorpay."],
  ["Can I get a refund?", <>Yes. Ask within 7 days of paying for a full refund (if you&rsquo;ve used no more than 5 AI actions), and duplicate payments are always refunded. See our <Link href="/refund-policy" className="font-medium text-brand-700 underline underline-offset-2">Refund Policy</Link> and <Link href="/cancellation-policy" className="font-medium text-brand-700 underline underline-offset-2">Cancellation Policy</Link>.</>],
  ["Can I switch from 1 month to 12 months later?", "Yes. Buying another pass adds its time to the end of your current one, so you never lose days."],
  ["Are prices inclusive of tax?", "Yes. Prices are in Indian Rupees and include any applicable taxes."],
];

/** Plain-text answers for structured data, matching the visible FAQ. */
const FAQ_TEXT: Record<string, string> = {
  "Is there a free plan?": `Yes, free forever with no card: ${free.aiActionsPerMonth} AI actions and ${free.jobAnalysesPerMonth} job analyses a month, one résumé and one cover-letter export, plus the full jobs feed, match scores, skills check and tracker.`,
  "What is a job analysis?": "Opening a job for the first time finds the employer's own posting, reads the full description and looks up market salary. Re-opening a job you've analysed is free, and jobs someone else already analysed cost nothing. Pro is unlimited within fair use.",
  "Can I get a refund?": "Yes. Ask within 7 days of paying for a full refund (if you've used no more than 5 AI actions), and duplicate payments are always refunded. See our Refund Policy and Cancellation Policy.",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const [user, methods, { limit }] = await Promise.all([getCurrentUser(), paymentMethods(), searchParams]);
  const prices = proPrices();
  const isPro = user ? planOf(user) === "pro" : false;
  const perDay = Math.ceil(prices.yearly / 365);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingFx />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            softwareApplication(),
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: typeof a === "string" ? a : FAQ_TEXT[q] } })),
            },
          ],
        }}
      />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.13),rgba(8,145,178,0.04)_55%,transparent)] blur-xl" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href={user ? "/dashboard" : "/login"} className="btn-ghost">{user ? "Dashboard" : "Sign in"}</Link>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6">
        {limit === "export" && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            You&rsquo;ve used the Free plan&rsquo;s export for this document type. Re-downloading the one you exported is still free; upgrade to Pro to export documents for other jobs.
          </div>
        )}

        <section className="text-center">
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
            Land more interviews with <em className="text-brand-700">CareerMatch Pro</em>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-700">Unlimited exports and job analyses, 80× the AI, and your best matches in your inbox every morning.</p>
          <p className="mt-2 text-base font-semibold text-slate-900">All for about {inr(perDay)} a day on the 12-month pass.</p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <PlanPicker prices={prices} signedIn={!!user} isPro={isPro} configured={billingConfigured()} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-5 py-4">
            <div>
              <p className="font-semibold text-slate-900">Free plan · ₹0</p>
              <p className="text-sm text-slate-600">{free.aiActionsPerMonth} AI actions and {free.jobAnalysesPerMonth} job analyses a month, 1 résumé and 1 cover-letter export. No card needed.</p>
            </div>
            {user ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{isPro ? "Included in Pro" : "Your current plan"}</span>
            ) : (
              <Link href="/signup" className="btn-secondary">Start free</Link>
            )}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="compare">
          <h2 id="compare" className="text-center font-display text-3xl sm:text-4xl">Everything in CareerMatch, side by side</h2>
          <div className="card mt-8 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-x-4 border-b border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:px-7">
              <span>Feature</span>
              <span className="text-center text-brand-700">Pro</span>
              <span className="text-center">Free</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {FEATURES.map(([name, what, p, f]) => (
                <li key={name} className="grid grid-cols-[minmax(0,1fr)_90px_90px] items-center gap-x-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:px-7">
                  <div>
                    <p className="font-semibold text-slate-900">{name}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{what}</p>
                  </div>
                  <span className="text-center text-sm font-semibold text-brand-700">{p}</span>
                  <span className={`text-center text-sm font-medium ${p !== f ? "text-slate-600" : "text-slate-800"}`}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="pay">
          <h2 id="pay" className="text-center font-display text-4xl sm:text-5xl">
            Pay <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent italic">your way</span>
          </h2>
          <p className="mx-auto mt-3 mb-6 max-w-2xl text-center text-base text-slate-700">
            UPI, debit and credit cards, net banking and wallets, through Razorpay&rsquo;s secure, RBI-compliant checkout. Your card details never touch our servers.
          </p>
          <PaymentMethods banks={methods.banks} wallets={methods.wallets} live={methods.live} />
        </section>

        <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq">
          <h2 id="faq" className="text-center font-display text-3xl sm:text-4xl">Questions</h2>
          <div className="card mt-8 divide-y divide-slate-200">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4 sm:px-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-900">
                  {q}
                  <span className="text-xl text-slate-500 transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-600">
            Still stuck? Email <a href={`mailto:${LEGAL.email}`} className="font-medium text-brand-700 underline underline-offset-2">{LEGAL.email}</a>
          </p>
        </section>

        <p className="mt-10 text-center text-sm text-slate-600">Prices in Indian Rupees, inclusive of applicable taxes. Payments processed by Razorpay.</p>
      </main>
      <footer className="relative border-t border-slate-200 py-8">
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-600" aria-label="Legal">
          {LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-900">{l.label}</Link>)}
        </nav>
      </footer>
    </div>
  );
}
