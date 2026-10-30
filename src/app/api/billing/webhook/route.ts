import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/billing";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/** Stripe webhook - signature-verified with STRIPE_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Not configured" }, { status: 400 });
  try {
    const type = await handleWebhook(await req.text(), sig);
    return NextResponse.json({ received: true, type });
  } catch (e) {
    log.warn("billing.webhook_rejected", { message: String(e) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
}
