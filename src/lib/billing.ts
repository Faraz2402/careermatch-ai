import "server-only";
// Razorpay billing for India: UPI (Google Pay, PhonePe, Paytm, BHIM, any UPI
// app), debit/credit cards (Visa, Mastercard, RuPay, Amex, Diners), net
// banking and wallets - all through Razorpay's hosted Checkout, so card data
// never touches this server.
//
// Pro is sold as a prepaid pass (1 month / 12 months) via the Orders API, which
// works with every payment method. (Auto-renewing mandates in India only
// support UPI Autopay, cards and e-NACH - not plain net banking.)
//
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
// optional PRO_MONTHLY_INR / PRO_YEARLY_INR (whole rupees).

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { log } from "./log";

const API = "https://api.razorpay.com/v1";
const MIN_AMOUNT_PAISE = 100; // Razorpay's minimum order (₹1)

/** A failed Razorpay API call; `status` is Razorpay's HTTP status (401 = bad keys). */
export class RazorpayError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export type Period = "monthly" | "yearly";

export function proPrices(): Record<Period, number> {
  return {
    monthly: Number(process.env.PRO_MONTHLY_INR) || 499,
    yearly: Number(process.env.PRO_YEARLY_INR) || 4999,
  };
}

export const billingConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const auth = () => `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;

async function razorpay<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: auth(), "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { description?: string } }).error?.description ?? `HTTP ${res.status}`;
    throw new RazorpayError(`Razorpay: ${msg}`, res.status);
  }
  return body as T;
}

/** Constant-time compare of two hex HMAC digests. */
function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? "") {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "") {
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export async function createOrder(user: { id: string }, period: Period) {
  const amount = Math.round(proPrices()[period] * 100); // paise
  if (!Number.isInteger(amount) || amount < MIN_AMOUNT_PAISE) throw new RazorpayError(`Order amount must be at least ${MIN_AMOUNT_PAISE} paise (got ${amount}).`, 400);
  const order = await razorpay<{ id: string; amount: number; currency: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `cm_${user.id.slice(-10)}_${Date.now().toString(36)}`,
      notes: { userId: user.id, period },
    }),
  });
  await db.payment.create({ data: { userId: user.id, orderId: order.id, amount: order.amount, currency: order.currency, period } });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID! };
}

/** Adds the paid period to Pro (stacking on any time still remaining). */
const extend = (from: Date, period: Period) => {
  const d = new Date(from);
  if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

/**
 * Mark an order paid and grant Pro. Idempotent: the browser callback and the
 * webhook may both arrive for the same payment.
 */
export async function fulfillOrder(orderId: string, paymentId: string, method?: string | null) {
  const payment = await db.payment.findUnique({ where: { orderId }, include: { user: { select: { id: true, planRenewsAt: true } } } });
  if (!payment) throw new Error("Unknown order.");
  if (payment.status === "paid") return { alreadyPaid: true, renewsAt: payment.user.planRenewsAt };

  // Confirm with Razorpay that this payment really captured this order's full amount.
  const p = await razorpay<{ id: string; order_id: string; status: string; amount: number; currency: string; method: string }>(`/payments/${paymentId}`);
  if (p.order_id !== orderId) throw new Error("Payment does not belong to this order.");
  if (p.amount !== payment.amount || p.currency !== payment.currency) throw new Error("Payment amount mismatch.");
  if (p.status === "authorized") {
    // Orders normally auto-capture; capture explicitly if the account doesn't.
    await razorpay(`/payments/${paymentId}/capture`, { method: "POST", body: JSON.stringify({ amount: p.amount, currency: p.currency }) });
  } else if (p.status !== "captured") {
    throw new Error(`Payment is ${p.status}.`);
  }

  const now = new Date();
  const start = payment.user.planRenewsAt && payment.user.planRenewsAt > now ? payment.user.planRenewsAt : now;
  const renewsAt = extend(start, payment.period as Period);
  // Only one request can flip status from "created" to "paid".
  const claimed = await db.payment.updateMany({
    where: { orderId, status: "created" },
    data: { status: "paid", paymentId, method: method ?? p.method, paidAt: now },
  });
  if (claimed.count === 0) return { alreadyPaid: true, renewsAt: payment.user.planRenewsAt };
  await db.user.update({ where: { id: payment.userId }, data: { plan: "pro", planRenewsAt: renewsAt } });
  log.info("billing.paid", { userId: payment.userId, orderId, method: method ?? p.method, period: payment.period });
  return { alreadyPaid: false, renewsAt };
}

export async function handleWebhook(rawBody: string, signature: string) {
  if (!verifyWebhookSignature(rawBody, signature)) throw new Error("Invalid webhook signature.");
  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string; method?: string } }; order?: { entity?: { id: string } } };
  };
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const pay = event.payload?.payment?.entity;
    const orderId = pay?.order_id ?? event.payload?.order?.entity?.id;
    if (pay?.id && orderId && (await db.payment.findUnique({ where: { orderId } }))) await fulfillOrder(orderId, pay.id, pay.method);
  }
  return event.event;
}

// --- Payment methods shown to users ---------------------------------------------

export type MethodsView = { live: boolean; banks: string[]; wallets: string[] };

let methodsCache: { at: number; value: MethodsView } | null = null;

/**
 * Net-banking banks and wallets enabled on the Razorpay account (public
 * /v1/methods endpoint, key id only). Falls back to the major-bank list.
 */
export async function paymentMethods(): Promise<MethodsView> {
  if (methodsCache && Date.now() - methodsCache.at < 24 * 3600_000) return methodsCache.value;
  const fallback: MethodsView = { live: false, banks: MAJOR_BANKS, wallets: MAJOR_WALLETS };
  if (!process.env.RAZORPAY_KEY_ID) return fallback;
  try {
    const res = await fetch(`${API}/methods`, {
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:`).toString("base64")}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = (await res.json()) as { netbanking?: Record<string, string>; wallet?: Record<string, boolean> };
    const banks = Object.values(m.netbanking ?? {}).sort((a, b) => a.localeCompare(b));
    const wallets = Object.entries(m.wallet ?? {}).filter(([, on]) => on).map(([k]) => WALLET_NAMES[k] ?? k);
    const value = { live: true, banks: banks.length ? banks : MAJOR_BANKS, wallets: wallets.length ? wallets : MAJOR_WALLETS };
    methodsCache = { at: Date.now(), value };
    return value;
  } catch (e) {
    log.warn("billing.methods_failed", { message: String(e) });
    return fallback;
  }
}

const WALLET_NAMES: Record<string, string> = {
  paytm: "Paytm", mobikwik: "MobiKwik", olamoney: "Ola Money", freecharge: "Freecharge", airtelmoney: "Airtel Payments Bank",
  jiomoney: "JioMoney", amazonpay: "Amazon Pay", phonepe: "PhonePe", payzapp: "PayZapp",
};

const MAJOR_WALLETS = ["Paytm", "Amazon Pay", "PhonePe", "MobiKwik", "Freecharge", "Airtel Payments Bank"];

/** Shown when Razorpay keys aren't set; the live list replaces it. */
export const MAJOR_BANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda",
  "Canara Bank", "Union Bank of India", "Bank of India", "Indian Bank", "Central Bank of India", "Indian Overseas Bank", "UCO Bank",
  "Bank of Maharashtra", "Punjab & Sind Bank", "IDBI Bank", "IndusInd Bank", "Yes Bank", "IDFC FIRST Bank", "Federal Bank",
  "South Indian Bank", "Karur Vysya Bank", "Karnataka Bank", "City Union Bank", "Tamilnad Mercantile Bank", "RBL Bank", "Bandhan Bank",
  "DCB Bank", "Dhanlaxmi Bank", "Jammu & Kashmir Bank", "CSB Bank", "AU Small Finance Bank", "Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank", "Jana Small Finance Bank", "Saraswat Co-operative Bank", "Cosmos Co-operative Bank",
  "Standard Chartered", "HSBC", "DBS Bank India", "Deutsche Bank", "Airtel Payments Bank", "India Post Payments Bank",
].sort((a, b) => a.localeCompare(b));
