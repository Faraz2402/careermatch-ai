import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { createPortal } from "@/lib/billing";
import { billingConfigured } from "@/lib/plans";

/** Stripe customer portal: change card, cancel, download invoices. */
export async function POST() {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!billingConfigured() || !user.stripeCustomerId) return jsonError("No billing account yet.", 400);
  return NextResponse.json({ url: await createPortal(user.stripeCustomerId) });
}
