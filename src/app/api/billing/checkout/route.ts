import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { createCheckout } from "@/lib/billing";
import { log } from "@/lib/log";
import { billingConfigured } from "@/lib/plans";

export async function POST() {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!billingConfigured()) return jsonError("Billing isn't configured on this server.", 503);
  if (user.isDemo) return jsonError("Create a real account to upgrade.", 400);
  if (user.plan === "pro") return jsonError("You're already on Pro.", 400);
  try {
    return NextResponse.json({ url: await createCheckout(user) });
  } catch (e) {
    log.error("billing.checkout_failed", { message: String(e) });
    return jsonError("Couldn't start checkout. Please try again.", 502);
  }
}
