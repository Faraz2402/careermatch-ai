"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, api } from "./client";

/** Daily 7 AM email: on/off switch and "send me one now" (Pro only). */
export function DigestSettings({ isPro, initialOn, email }: { isPro: boolean; initialOn: boolean; email: string }) {
  const [on, setOn] = useState(initialOn);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "info" | "error"; text: string } | null>(null);

  async function run(json: { enabled?: boolean; sendTest?: boolean }) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ ok: boolean; message?: string }>("/api/account/digest", { method: "POST", json });
      if (json.enabled !== undefined) setOn(json.enabled);
      if (r.message) setMsg({ kind: r.ok ? "success" : "info", text: r.message });
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mb-6 space-y-3 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Daily job email</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your best new matches every morning at 7 AM (IST), with scores and skills, sent to <b>{email}</b>.
          </p>
        </div>
        {isPro && (
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="size-4 accent-brand-600" checked={on} disabled={busy} onChange={(e) => run({ enabled: e.target.checked })} />
            {on ? "On" : "Off"}
          </label>
        )}
      </div>
      {isPro ? (
        <button className="btn-secondary" disabled={busy || !on} onClick={() => run({ sendTest: true })}>
          {busy ? "Working…" : "Send me today's email now"}
        </button>
      ) : (
        <p className="text-sm text-slate-600">
          Part of Pro. <Link href="/pricing" className="font-semibold text-brand-700 underline underline-offset-2">See plans</Link>
        </p>
      )}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
    </section>
  );
}
