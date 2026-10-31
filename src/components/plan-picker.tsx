"use client";

import Link from "next/link";
import { useState } from "react";
import { cx } from "@/lib/format";
import { UpgradeButton } from "./upgrade-button";

type Period = "monthly" | "yearly";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Choose a Pro pass length, see what you pay today, and check out. */
export function PlanPicker({ prices, signedIn, isPro, configured }: { prices: Record<Period, number>; signedIn: boolean; isPro: boolean; configured: boolean }) {
  const [period, setPeriod] = useState<Period>("yearly");
  const saving = prices.monthly * 12 - prices.yearly;
  const savingPct = Math.round((saving / (prices.monthly * 12)) * 100);
  const options: { id: Period; title: string; price: string; per: string; note: string; badge?: string }[] = [
    { id: "monthly", title: "1 month", price: inr(prices.monthly), per: "/ month", note: "One payment · use for 30 days" },
    {
      id: "yearly",
      title: "12 months",
      price: inr(Math.round(prices.yearly / 12)),
      per: "/ month",
      note: `${inr(prices.yearly)} paid once · 365 days`,
      badge: savingPct > 0 ? `Best value · save ${savingPct}%` : "Best value",
    },
  ];

  return (
    <div className="card p-5 sm:p-7">
      <div role="radiogroup" aria-label="Pro pass length" className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const on = period === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPeriod(o.id)}
              className={cx(
                "relative rounded-2xl border p-5 text-left transition",
                on ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500" : "border-slate-200 hover:border-slate-400",
              )}
            >
              {o.badge && <span className="absolute -top-3 right-4 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">{o.badge}</span>}
              <span className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <span className={cx("grid size-4 place-items-center rounded-full border-2", on ? "border-brand-600" : "border-slate-400")} aria-hidden>
                  {on && <span className="size-2 rounded-full bg-brand-600" />}
                </span>
                {o.title}
              </span>
              <span className="mt-3 block">
                <span className="font-display text-4xl text-slate-900">{o.price}</span>
                <span className="ml-1 text-sm text-slate-600">{o.per}</span>
              </span>
              <span className="mt-1 block text-sm text-slate-600">{o.note}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 pt-5">
        <div>
          <p className="text-sm text-slate-600">You pay today</p>
          <p className="font-display text-3xl text-slate-900">{inr(prices[period])}</p>
          {period === "yearly" && saving > 0 && <p className="text-sm font-medium text-emerald-700">You save {inr(saving)} vs. paying monthly</p>}
        </div>
        <div className="w-full sm:w-64">
          {signedIn ? (
            <UpgradeButton
              period={period}
              configured={configured}
              className="w-full py-3 text-base"
              label={isPro ? `Extend Pro · ${inr(prices[period])}` : `Upgrade to Pro · ${inr(prices[period])}`}
            />
          ) : (
            <Link href="/signup" className="btn-primary w-full py-3 text-base">
              Create a free account to upgrade
            </Link>
          )}
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
        {["Secure checkout by Razorpay", "UPI · cards · net banking · wallets", "No auto-renewal", "7-day refund policy"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span className="text-emerald-600" aria-hidden>✓</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
