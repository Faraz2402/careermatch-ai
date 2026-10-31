import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { fulfillOrder, verifyCheckoutSignature } from "@/lib/billing";
import { db } from "@/lib/db";
import { log } from "@/lib/log";

const Body = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

/** Called by Checkout's success handler. The webhook also fulfils, idempotently. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const order = await db.payment.findUnique({ where: { orderId: data.razorpay_order_id } });
  if (!order || order.userId !== user.id) return jsonError("Order not found.", 404);
  if (!verifyCheckoutSignature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature))
    return jsonError("Payment signature check failed.", 400);
  try {
    const r = await fulfillOrder(data.razorpay_order_id, data.razorpay_payment_id);
    return NextResponse.json({ ok: true, renewsAt: r.renewsAt });
  } catch (e) {
    log.error("billing.verify_failed", { message: String(e), orderId: data.razorpay_order_id });
    return jsonError("We couldn't confirm the payment yet. If money was deducted, Pro will activate automatically within a few minutes.", 502);
  }
}
