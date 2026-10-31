import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { billingConfigured, createOrder } from "@/lib/billing";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ period: z.enum(["monthly", "yearly"]) });

/** Create a Razorpay order for a prepaid Pro pass; the client opens Checkout with it. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!billingConfigured()) return jsonError("Payments aren't set up on this server yet.", 503);
  if (user.isDemo) return jsonError("Create a real account to upgrade.", 400);
  if (!(await rateLimit(`order:${user.id}`, 10, 60 * 60_000)).ok) return jsonError("Too many attempts. Please try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  try {
    const order = await createOrder(user, data.period);
    return NextResponse.json({ ...order, name: user.name ?? "", email: user.email });
  } catch (e) {
    log.error("billing.order_failed", { message: String(e) });
    return jsonError("Couldn't start the payment. Please try again.", 502);
  }
}
