import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { finishGoogleAuth, googleEnabled, OAUTH_COOKIE } from "@/lib/google-oauth";
import { log } from "@/lib/log";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, req.url));
  if (!googleEnabled()) return fail("google_disabled");

  const jar = await cookies();
  const [state, verifier] = (jar.get(OAUTH_COOKIE)?.value ?? "").split(".");
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return fail("google_state");

  try {
    const g = await finishGoogleAuth(code, verifier);
    if (!g.email_verified) return fail("google_unverified");
    const email = g.email.toLowerCase();
    // Link by Google ID first, then by (verified) email.
    let user = (await db.user.findUnique({ where: { googleId: g.sub } })) ?? (await db.user.findUnique({ where: { email } }));
    if (user) {
      if (!user.googleId || !user.emailVerifiedAt)
        user = await db.user.update({ where: { id: user.id }, data: { googleId: g.sub, emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
    } else {
      user = await db.user.create({
        data: { email, name: g.name ?? null, googleId: g.sub, emailVerifiedAt: new Date(), passwordHash: await hashPassword(randomBytes(24).toString("hex")) },
      });
    }
    await createSession(user.id);
    const hasProfile = await db.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
    return NextResponse.redirect(new URL(hasProfile ? "/dashboard" : "/onboarding", req.url));
  } catch (e) {
    log.error("google.callback_failed", { message: String(e) });
    return fail("google_failed");
  }
}
