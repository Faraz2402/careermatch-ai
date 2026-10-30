import "server-only";
// Stripe subscription billing. Active only when STRIPE_SECRET_KEY and
// STRIPE_PRICE_ID are set; STRIPE_WEBHOOK_SECRET is required for the webhook.

import Stripe from "stripe";
import { db } from "./db";
import { log } from "./log";
import { appUrl } from "./mailer";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export async function createCheckout(user: { id: string; email: string; stripeCustomerId: string | null }) {
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    ...(user.stripeCustomerId ? { customer: user.stripeCustomerId } : { customer_email: user.email }),
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/settings?billing=success`,
    cancel_url: `${appUrl()}/pricing?billing=cancelled`,
  });
  return session.url!;
}

export async function createPortal(customerId: string) {
  const s = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl()}/settings` });
  return s.url;
}

export async function cancelStripeCustomer(customerId: string) {
  const subs = await stripe().subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  for (const s of subs.data) if (!["canceled", "incomplete_expired"].includes(s.status)) await stripe().subscriptions.cancel(s.id);
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Newer API versions moved the period to subscription items.
  const raw = (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return raw ? new Date(raw * 1000) : null;
}

async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const active = ["active", "trialing", "past_due"].includes(sub.status);
  const userId = sub.metadata?.userId;
  const where = userId ? { id: userId } : { stripeCustomerId: customerId };
  await db.user.updateMany({ where, data: { plan: active ? "pro" : "free", stripeCustomerId: customerId, planRenewsAt: active ? periodEnd(sub) : null } });
  log.info("billing.subscription", { customerId, status: sub.status });
}

export async function handleWebhook(rawBody: string, signature: string) {
  const event = stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id ?? s.metadata?.userId;
      if (userId && s.customer) await db.user.update({ where: { id: userId }, data: { stripeCustomerId: typeof s.customer === "string" ? s.customer : s.customer.id } });
      if (s.subscription) await applySubscription(await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id));
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
  }
  return event.type;
}
