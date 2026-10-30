import Link from "next/link";
import { UpgradeButton } from "@/components/upgrade-button";
import { Logo } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { billingConfigured, PLANS } from "@/lib/plans";

export const metadata = { title: "Pricing" };

const FEATURES: [string, string, string][] = [
  ["AI actions per month", String(PLANS.free.aiActionsPerMonth), String(PLANS.pro.aiActionsPerMonth)],
  ["Saved searches & alerts", String(PLANS.free.savedSearches), String(PLANS.pro.savedSearches)],
  ["Resume versions", String(PLANS.free.resumeVersions), String(PLANS.pro.resumeVersions)],
  ["Job matching & applications board", "✓", "✓"],
  ["DOCX / PDF export & profile page", "✓", "✓"],
  ["Mock interviews", "✓", "✓"],
];

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const user = await getCurrentUser();
  const cancelled = (await searchParams).billing === "cancelled";
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,var(--color-brand-100),transparent_60%)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href={user ? "/dashboard" : "/login"} className="btn-ghost">{user ? "Dashboard" : "Sign in"}</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-center font-display text-4xl font-extrabold tracking-tight">Simple pricing</h1>
        <p className="mt-3 text-center text-slate-600">Start free. Upgrade when you&apos;re applying at full speed.</p>
        {cancelled && <p className="mt-4 text-center text-sm text-slate-500">Checkout was cancelled — you haven&apos;t been charged.</p>}
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {(["free", "pro"] as const).map((id) => {
            const p = PLANS[id];
            const current = user?.plan === id || (!user && false);
            return (
              <div key={id} className={`card p-8 ${id === "pro" ? "ring-2 ring-brand-500" : ""}`}>
                <h2 className="font-display text-xl font-bold">{p.name}</h2>
                <p className="mt-2 font-display text-4xl font-extrabold">{p.price}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {FEATURES.map(([label, free, pro]) => (
                    <li key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                      <span className="text-slate-600">{label}</span>
                      <b>{id === "free" ? free : pro}</b>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {id === "free" ? (
                    <Link href={user ? "/dashboard" : "/signup"} className="btn-secondary w-full">{user ? (current ? "Current plan" : "Included") : "Get started"}</Link>
                  ) : current ? (
                    <Link href="/settings" className="btn-secondary w-full">Current plan · manage</Link>
                  ) : user ? (
                    <UpgradeButton configured={billingConfigured()} />
                  ) : (
                    <Link href="/signup" className="btn-primary w-full">Start free, upgrade anytime</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">Payments are processed securely by Stripe. Cancel anytime from Settings.</p>
      </main>
    </div>
  );
}
