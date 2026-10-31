"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, api } from "./client";
import { useToast } from "./toast";

type Account = {
  email: string;
  name: string | null;
  isDemo: boolean;
  verified: boolean;
  /** Linked sign-in providers ("Google", "Microsoft", "LinkedIn"). */
  social: string[];
  plan: "free" | "pro";
  planName: string;
  /** ISO date Pro is paid until (null on Free) */
  proUntil: string | null;
  payments: { id: string; paidAt: string; amount: number; period: string; method: string | null; paymentId: string | null }[];
  used: number;
  limit: number;
};

const METHOD_LABEL: Record<string, string> = { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI", paylater: "Pay later" };

const FLASH = {
  verified: { kind: "success" as const, text: "Email confirmed — alerts and reminders are on." },
  verify_failed: { kind: "error" as const, text: "That confirmation link is invalid or expired. Send a new one below." },
  billing: { kind: "success" as const, text: "Payment received — thank you! Pro is active." },
};

export function SettingsPanel({ account: a, flash }: { account: Account; flash: keyof typeof FLASH | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [del, setDel] = useState({ password: "", confirm: "" });
  const [busy, setBusy] = useState("");

  async function go(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  const pct = Math.min(100, Math.round((a.used / a.limit) * 100));

  return (
    <div className="space-y-6">
      {flash && <Alert kind={FLASH[flash].kind}>{FLASH[flash].text}</Alert>}

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">Account</h2>
        <p className="text-sm">{a.name ?? "—"} · {a.isDemo ? "Demo account" : a.email}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {a.verified ? <span className="chip bg-emerald-50 text-emerald-700">✓ Email verified</span> : <span className="chip bg-amber-50 text-amber-800">Email not verified</span>}
          {a.social.map((p) => <span key={p} className="chip bg-slate-100 text-slate-700">{p} sign-in linked</span>)}
          {!a.verified && !a.isDemo && (
            <button className="btn-secondary px-3 py-1 text-xs" disabled={busy === "verify"} onClick={() => go("verify", async () => {
              const r = await api<{ devUrl?: string }>("/api/auth/verify", { method: "POST" });
              toast(r.devUrl ? "Sent to the dev outbox (no email provider configured)." : "Confirmation email sent.");
            })}>Resend confirmation</button>
          )}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Plan & usage</h2>
          <span className={`chip ${a.plan === "pro" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-700"}`}>{a.planName}</span>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-600"><span>AI actions this month</span><span>{a.used} / {a.limit}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={a.used} aria-valuemax={a.limit} aria-label="AI usage">
            <div className={`h-full rounded-full ${pct > 85 ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Generated documents, cover letters and mock interviews count once each. Template drafts (no AI) are free.</p>
        </div>
        {a.proUntil && (
          <p className="text-sm">
            Pro is paid until <b>{new Date(a.proUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</b>. It won&apos;t renew automatically — extend any time.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing" className="btn-primary">{a.plan === "free" ? "Upgrade to Pro" : "Extend Pro"}</Link>
        </div>
        {a.payments.length > 0 && (
          <div className="overflow-x-auto">
            <p className="mb-2 text-sm font-semibold">Payment history</p>
            <table className="w-full min-w-[440px] text-sm">
              <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1 font-medium">Date</th><th className="pb-1 font-medium">Pass</th><th className="pb-1 font-medium">Paid with</th><th className="pb-1 font-medium">Amount</th><th className="pb-1 font-medium">Reference</th></tr></thead>
              <tbody>
                {a.payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="py-1.5">{new Date(p.paidAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-1.5">{p.period === "yearly" ? "12 months" : "1 month"}</td>
                    <td className="py-1.5">{p.method ? METHOD_LABEL[p.method] ?? p.method : "—"}</td>
                    <td className="py-1.5">₹{(p.amount / 100).toLocaleString("en-IN")}</td>
                    <td className="py-1.5 font-mono text-xs text-slate-500">{p.paymentId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!a.isDemo && (
        <section className="card space-y-3 p-6">
          <h2 className="font-display text-lg font-bold">{a.social.length ? "Set a password" : "Change password"}</h2>
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
            e.preventDefault();
            go("pw", async () => {
              await api("/api/account/password", { method: "POST", json: pw });
              setPw({ current: "", next: "" });
              toast("Password updated. Other devices were signed out.");
            });
          }}>
            {!a.social.length && <input className="input" type="password" autoComplete="current-password" placeholder="Current password" aria-label="Current password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />}
            <input className="input" type="password" autoComplete="new-password" placeholder="New password" aria-label="New password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            <button className="btn-primary" disabled={busy === "pw"}>Update password</button>
          </form>
        </section>
      )}

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-bold">Your data</h2>
        <p className="text-sm text-slate-600">
          Resume content is encrypted at rest. Listings no longer offered by their source are removed within 30 days, and demo accounts are deleted after 24 hours.
        </p>
        <a href="/api/account/export" className="btn-secondary">⬇ Download all my data (JSON)</a>
      </section>

      <section className="card space-y-3 border-rose-200 p-6">
        <h2 className="font-display text-lg font-bold text-rose-700">Delete account</h2>
        <p className="text-sm text-slate-600">Permanently deletes your profile, resumes, generated documents, saved searches and tracked applications. This can&apos;t be undone.</p>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => {
          e.preventDefault();
          go("delete", async () => {
            const r = await api<{ redirect: string }>("/api/account", { method: "DELETE", json: { password: del.password || undefined, confirm: del.confirm } });
            router.push(r.redirect);
            router.refresh();
          });
        }}>
          {!a.social.length && !a.isDemo && <input className="input" type="password" placeholder="Your password" aria-label="Password" value={del.password} onChange={(e) => setDel({ ...del, password: e.target.value })} required />}
          <input className="input" placeholder='Type "DELETE"' aria-label='Type DELETE to confirm' value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} required />
          <button className="btn bg-rose-600 text-white hover:bg-rose-700" disabled={del.confirm !== "DELETE" || busy === "delete"}>Delete forever</button>
        </form>
      </section>
    </div>
  );
}
