import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/account-emails";
import { apiUser, jsonError } from "@/lib/api";
import { consumeEmailVerification } from "@/lib/auth";
import { mailConfigured } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";

/** Link target from the verification email. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token.length >= 20 && (await consumeEmailVerification(token));
  return NextResponse.redirect(new URL(ok ? "/settings?verified=1" : "/settings?verified=0", req.url));
}

/** Resend the verification email. */
export async function POST() {
  const { user, error } = await apiUser();
  if (error) return error;
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true, already: true });
  if (user.isDemo) return jsonError("Demo accounts can't verify an email.", 400);
  if (!(await rateLimit(`verify:${user.id}`, 3, 60 * 60_000)).ok) return jsonError("Too many requests. Try again later.", 429);
  const url = await sendVerificationEmail(user);
  return NextResponse.json({ ok: true, devUrl: !mailConfigured() && process.env.NODE_ENV !== "production" ? url : undefined });
}
