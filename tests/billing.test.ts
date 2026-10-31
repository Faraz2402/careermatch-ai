import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createOrder, extend, MAJOR_BANKS, proPrices, RazorpayError, verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/billing";
import { planOf } from "@/lib/plans";

const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

describe("Razorpay signatures", () => {
  it("accepts a genuine checkout signature and rejects tampering", () => {
    const sig = hmac("key_secret", "order_ABC|pay_XYZ");
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "key_secret")).toBe(true);
    expect(verifyCheckoutSignature("order_ABC", "pay_OTHER", sig, "key_secret")).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "wrong_secret")).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", "short", "key_secret")).toBe(false);
    expect(verifyCheckoutSignature("order_ABC", "pay_XYZ", sig, "")).toBe(false); // unconfigured
  });

  it("verifies webhooks against the raw body", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const sig = hmac("wh_secret", body);
    expect(verifyWebhookSignature(body, sig, "wh_secret")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "wh_secret")).toBe(false);
  });
});

describe("prepaid Pro", () => {
  it("is Pro only until the paid date", () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(planOf({ plan: "pro", planRenewsAt: tomorrow })).toBe("pro");
    expect(planOf({ plan: "pro", planRenewsAt: yesterday })).toBe("free");
    expect(planOf({ plan: "free", planRenewsAt: tomorrow })).toBe("free");
  });

  it("prices in rupees with sensible defaults", () => {
    expect(proPrices()).toEqual({ monthly: 499, yearly: 4999 });
  });

  it("lists major Indian banks for net banking", () => {
    for (const b of ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank", "Punjab National Bank"]) expect(MAJOR_BANKS).toContain(b);
  });
});

describe("orders", () => {
  it("refuses amounts below Razorpay's 100-paise minimum before calling Razorpay", async () => {
    const prev = process.env.PRO_MONTHLY_INR;
    process.env.PRO_MONTHLY_INR = "0.5";
    try {
      await expect(createOrder({ id: "u1" }, "monthly")).rejects.toBeInstanceOf(RazorpayError);
    } finally {
      process.env.PRO_MONTHLY_INR = prev;
    }
  });
});

describe("pass length", () => {
  it("adds calendar months without spilling into the next month", () => {
    expect(extend(new Date("2100-01-31T23:59:59Z"), "monthly").toISOString()).toBe("2100-02-28T23:59:59.000Z");
    expect(extend(new Date("2028-01-31T10:00:00Z"), "monthly").toISOString()).toBe("2028-02-29T10:00:00.000Z");
    expect(extend(new Date("2026-10-31T16:33:16Z"), "monthly").toISOString()).toBe("2026-11-30T16:33:16.000Z");
    expect(extend(new Date("2028-02-29T00:00:00Z"), "yearly").toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(extend(new Date("2026-05-15T00:00:00Z"), "monthly").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});
