import Link from "next/link";
import { LandingFx } from "@/components/landing-fx";
import { PaymentMethods } from "@/components/payment-methods";
import { PlanPicker } from "@/components/plan-picker";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { paymentMethods } from "@/lib/billing";
import { LEGAL } from "@/lib/legal";
import { billingConfigured, PLANS, planOf, proPrices } from "@/lib/plans";

export const metadata = { title: "Pricing", description: "CareerMatch AI Free and Pro plans in Indian Rupees: AI-tailored résumés, exports, alerts and more." };

const { free, pro } = PLANS;

/** [feature, what it does for you, Pro, Free] - only features the product really has. */
const FEATURES: [string, string, string, string][] = [
  ["AI actions", "Tailored résumés, cover letters, match analyses, gap reports and interview practice.", `${pro.aiActionsPerMonth} / month`, `${free.aiActionsPerMonth} / month`],
  ["Résumé export to PDF & Word", "ATS-safe templates (Classic, Modern, Compact), ready to upload.", "Unlimited", `${free.resumeExports} résumé`],
  ["Cover-letter export", "Download every cover letter as PDF or Word.", "Unlimited", "Unlimited"],
  ["Résumé versions", "A version per role, so every application is on target.", `${pro.resumeVersions}`, `${free.resumeVersions}`],
  ["Saved searches & email alerts", "Get new matches in your inbox, daily or weekly.", `${pro.savedSearches}`, `${free.savedSearches}`],
  ["Job match score", "Every listing scored against your résumé, with the reasons shown.", "Unlimited", "Unlimited"],
  ["Skills check", "Every skill a job asks for, marked green (you have it) or red (missing).", "Unlimited", "Unlimited"],
  ["Original apply links", "The employer's own posting, plus LinkedIn and Naukri when listed.", "Included", "Included"],
  ["Market salary in ₹", "Public pay figures for the same title and city, with sources.", "Included", "Included"],
  ["Jobs feed", "Fresh roles from official job APIs and employer career sites.", "Unlimited", "Unlimited"],
  ["Application tracker", "Track every application, note and follow-up in one board.", "Unlimited", "Unlimited"],
  ["Public profile page", "Your own shareable page with privacy controls.", "Included", "Included"],
];

const FAQ: [string, React.ReactNode][] = [
  ["Is there a free plan?", <>Yes. Free is free forever, with {free.aiActionsPerMonth} AI actions a month and one tailored résumé export. No card needed.</>],
  ["Is Pro a subscription?", "No. Pro is a prepaid pass for 1 or 12 months. Nothing renews automatically and nothing is debited without you. Buy again whenever you like to extend."],
  ["What counts as an AI action?", "Each AI-generated item: a tailored résumé, cover letter, match analysis, missing-skills report, talking points or mock interview. Reading job requirements, scores and apply links don't count."],
  ["What does \"1 résumé export\" mean on Free?", "You can download one tailored résumé as PDF or Word, in any template, as often as you like. To export résumés for other jobs, upgrade to Pro."],
  ["Which payment methods work?", "UPI (Google Pay, PhonePe, Paytm, BHIM and any UPI app), debit and credit cards (Visa, Mastercard, RuPay, Amex), net banking and wallets, through Razorpay."],
  ["Can I get a refund?", <>Yes. If Pro doesn&rsquo;t work as described, ask within 7 days of paying. See the refund terms in our <Link href="/terms#payments" className="font-medium text-brand-700 underline underline-offset-2">Terms of Service</Link>.</>],
  ["Can I switch from 1 month to 12 months later?", "Yes. Buying another pass adds its time to the end of your current one, so you never lose days."],
  ["Are prices inclusive of tax?", "Yes. Prices are in Indian Rupees and include any applicable taxes."],
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ limit?: string }> }) {
  const [user, methods, { limit }] = await Promise.all([getCurrentUser(), paymentMethods(), searchParams]);
  const prices = proPrices();
  const isPro = user ? planOf(user) === "pro" : false;
  const perDay = Math.ceil(prices.yearly / 365);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingFx />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.13),rgba(8,145,178,0.04)_55%,transparent)] blur-xl" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href={user ? "/dashboard" : "/login"} className="btn-ghost">{user ? "Dashboard" : "Sign in"}</Link>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pt-10 pb-16 sm:px-6">
        {limit === "export" && (
          <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
            You&rsquo;ve used the Free plan&rsquo;s résumé export. Re-downloading that résumé is still free; upgrade to Pro to export résumés for other jobs.
          </div>
        )}

        <section className="text-center">
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
            Land more interviews with <em className="text-brand-700">CareerMatch Pro</em>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-700">Sharper résumés for every role, more AI, unlimited exports and alerts.</p>
          <p className="mt-2 text-base font-semibold text-slate-900">All for about {inr(perDay)} a day on the 12-month pass.</p>
        </section>

        <section className="mx-auto mt-10 max-w-3xl">
          <PlanPicker prices={prices} signedIn={!!user} isPro={isPro} configured={billingConfigured()} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-5 py-4">
            <div>
              <p className="font-semibold text-slate-900">Free plan · ₹0</p>
              <p className="text-sm text-slate-600">{free.aiActionsPerMonth} AI actions a month, 1 résumé export and every core feature. No card needed.</p>
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
          <h2 id="pay" className="text-center font-display text-3xl sm:text-4xl">Pay your way</h2>
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
        <nav className="flex justify-center gap-5 text-sm text-slate-600" aria-label="Legal">
          <Link href="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms of Service</Link>
        </nav>
      </footer>
    </div>
  );
}
