import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/api";
import { sendPasswordResetEmail } from "@/lib/account-emails";
import { mailConfigured } from "@/lib/mailer";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().toLowerCase().email() });

export async function POST(req: Request) {
  if (!(await rateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000)).ok) return jsonError("Too many requests. Try again later.", 429);
  const { data, error } = await readBody(req, Body);
  if (error) return error;

  const user = await db.user.findUnique({ where: { email: data.email } });
  let devResetUrl: string | undefined;
  if (user && !user.isDemo) {
    const url = await sendPasswordResetEmail(user);
    // Without an email provider (dev), surface the link so the flow is testable.
    if (!mailConfigured() && process.env.NODE_ENV !== "production") devResetUrl = url;
  }
  // Same response whether or not the account exists.
  return NextResponse.json({ ok: true, devResetUrl });
}
