"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/format";
import { api } from "./client";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (e: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CHECKOUT_JS;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load the payment window. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

/**
 * Opens Razorpay Checkout (UPI, cards, net banking, wallets) for a prepaid
 * Pro pass, then confirms the payment with our server.
 */
export function UpgradeButton({ period, label, configured, className }: { period: "monthly" | "yearly"; label: string; configured: boolean; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!configured) return <p className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-500">Payments aren&apos;t set up on this server yet (Razorpay keys missing).</p>;

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await loadCheckout();
      const o = await api<{ orderId: string; amount: number; currency: string; keyId: string; name: string; email: string }>("/api/billing/order", { method: "POST", json: { period } });
      const rzp = new window.Razorpay!({
        key: o.keyId,
        order_id: o.orderId,
        amount: o.amount,
        currency: o.currency,
        name: "CareerMatch AI",
        description: period === "yearly" ? "Pro — 12 months" : "Pro — 1 month",
        prefill: { name: o.name, email: o.email },
        theme: { color: "#4f46e5" },
        handler: async (r: RazorpayResponse) => {
          try {
            await api("/api/billing/verify", { method: "POST", json: r });
            router.push("/settings?billing=success");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on("payment.failed", (e) => {
        setError(e.error?.description ?? "Payment failed. No money was taken — please try again.");
        setBusy(false);
      });
      rzp.open();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button className={cx("btn-primary w-full", className)} disabled={busy} onClick={pay}>
        {busy ? "Opening secure payment…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600" role="alert">{error}</p>}
    </>
  );
}
