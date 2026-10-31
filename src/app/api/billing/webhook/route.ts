import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/billing";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * Razorpay webhook (payment.captured / order.paid), verified with
 * RAZORPAY_WEBHOOK_SECRET. Activates Pro even if the buyer closed the tab
 * before the Checkout callback ran.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("x-razorpay-signature");
  if (!sig || !process.env.RAZORPAY_WEBHOOK_SECRET) return NextResponse.json({ error: "Not configured" }, { status: 400 });
  try {
    const type = await handleWebhook(await req.text(), sig);
    return NextResponse.json({ received: true, type });
  } catch (e) {
    log.warn("billing.webhook_rejected", { message: String(e) });
    return NextResponse.json({ error: "Rejected" }, { status: 400 });
  }
}
