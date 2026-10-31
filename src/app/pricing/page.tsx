import Link from "next/link";
import { PaymentMethods } from "@/components/payment-methods";
import { UpgradeButton } from "@/components/upgrade-button";
import { LandingFx } from "@/components/landing-fx";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { paymentMethods } from "@/lib/billing";
import { billingConfigured, PLANS, planOf, proPrices } from "@/lib/plans";

export const metadata = { title: "Pricing" };

const FEATURES: [string, string, string][] = [
  ["AI actions per month", String(PLANS.free.aiActionsPerMonth), String(PLANS.pro.aiActionsPerMonth)],
  ["Saved searches & alerts", String(PLANS.free.savedSearches), String(PLANS.pro.savedSearches)],
  ["Resume versions", String(PLANS.free.resumeVersions), String(PLANS.pro.resumeVersions)],
  ["Job matching & applications board", "✓", "✓"],
  ["DOCX / PDF export & profile page", "✓", "✓"],
  ["Mock interviews", "✓", "✓"],
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default async function PricingPage() {
  const [user, methods] = await Promise.all([getCurrentUser(), paymentMethods()]);
  const prices = proPrices();
  const isPro = user ? planOf(user) === "pro" : false;
  const configured = billingConfigured();
  const yearlySaving = Math.round(100 - (prices.yearly / (prices.monthly * 12)) * 100);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingFx />
      <div aria-hidden className="lux-aurora pointer-events-none absolute -top-72 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.13),rgba(8,145,178,0.04)_55%,transparent)] blur-xl" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href={user ? "/dashboard" : "/login"} className="btn-ghost">{user ? "Dashboard" : "Sign in"}</Link>
      </header>
      <main className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="text-center font-display text-5xl sm:text-6xl">Simple, <em>honest</em> pricing.</h1>
        <p className="mt-3 text-center text-slate-600">Start free. Buy a Pro pass when you&apos;re applying at full speed — no auto-debit, no subscription to cancel.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="card p-7">
            <h2 className="font-display text-xl font-bold">Free</h2>
            <p className="mt-2 font-display text-4xl font-extrabold">₹0</p>
            <p className="text-xs text-slate-500">forever</p>
            <Link href={user ? "/dashboard" : "/signup"} className="btn-secondary mt-6 w-full">{user ? (isPro ? "Included" : "Current plan") : "Get started"}</Link>
          </div>
          {(["monthly", "yearly"] as const).map((period) => (
            <div key={period} className={`card relative p-7 ${period === "yearly" ? "ring-2 ring-brand-500" : ""}`}>
              {period === "yearly" && yearlySaving > 0 && <span className="chip absolute -top-3 right-5 bg-brand-600 text-white">Save {yearlySaving}%</span>}
              <h2 className="font-display text-xl font-bold">Pro · {period === "yearly" ? "12 months" : "1 month"}</h2>
              <p className="mt-2 font-display text-4xl font-extrabold">{inr(prices[period])}</p>
              <p className="text-xs text-slate-500">{period === "yearly" ? `≈ ${inr(Math.round(prices.yearly / 12))}/month · one payment` : "one payment · renew when you like"}</p>
              <div className="mt-6">
                {user ? (
                  <UpgradeButton period={period} configured={configured} label={isPro ? `Extend Pro by ${period === "yearly" ? "12 months" : "1 month"}` : `Pay ${inr(prices[period])}`} />
                ) : (
                  <Link href="/signup" className="btn-primary w-full">Start free, upgrade anytime</Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="card mt-8 overflow-x-auto p-6">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-slate-500"><th className="pb-2 font-medium">Feature</th><th className="pb-2 font-medium">Free</th><th className="pb-2 font-medium">Pro</th></tr></thead>
            <tbody>
              {FEATURES.map(([label, free, pro]) => (
                <tr key={label} className="border-t border-slate-100"><td className="py-2 text-slate-600">{label}</td><td className="py-2 font-semibold">{free}</td><td className="py-2 font-semibold">{pro}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-14 text-center font-display text-2xl font-extrabold">Pay your way</h2>
        <p className="mt-2 mb-6 text-center text-sm text-slate-600">UPI, debit and credit cards, net banking and wallets — through Razorpay&apos;s secure, RBI-compliant checkout. Your card details never touch our servers.</p>
        <PaymentMethods banks={methods.banks} wallets={methods.wallets} live={methods.live} />
        <p className="mt-6 text-center text-xs text-slate-500">Prices in Indian Rupees, inclusive of applicable taxes. Payments processed by Razorpay.</p>
      </main>
      <footer className="relative border-t border-slate-200 py-8"><nav className="flex justify-center gap-5 text-xs text-slate-500" aria-label="Legal"><Link href="/privacy" className="hover:text-slate-800">Privacy Policy</Link><Link href="/terms" className="hover:text-slate-800">Terms of Service</Link></nav></footer>
    </div>
  );
}
