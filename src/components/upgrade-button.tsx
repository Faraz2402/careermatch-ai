"use client";

import { useState } from "react";
import { api } from "./client";

export function UpgradeButton({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!configured) return <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">Billing isn&apos;t set up on this server yet (Stripe keys missing).</p>;
  return (
    <>
      <button
        className="btn-primary w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const r = await api<{ url: string }>("/api/billing/checkout", { method: "POST" });
            window.location.href = r.url; // Stripe-hosted checkout
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening checkout…" : "Upgrade to Pro"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </>
  );
}
