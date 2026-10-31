import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { finishAuth, ID_FIELD, isProvider, OAUTH_COOKIE, providerEnabled } from "@/lib/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}&provider=${encodeURIComponent(provider)}`, req.url));
  if (!isProvider(provider) || !providerEnabled(provider)) return fail("oauth_disabled");
  if (url.searchParams.get("error")) return fail("oauth_cancelled"); // user declined on the provider's page

  const jar = await cookies();
  const [state, verifier] = (jar.get(OAUTH_COOKIE)?.value ?? "").split(".");
  jar.delete({ name: OAUTH_COOKIE, path: `/api/auth/oauth/${provider}` });
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return fail("oauth_state");

  try {
    const p = await finishAuth(provider, code, verifier ?? "");
    if (!p.id || !p.email.includes("@")) return fail("oauth_no_email");
    const email = p.email.toLowerCase();
    const field = ID_FIELD[provider];

    // Already linked to this provider account?
    let user = await db.user.findFirst({ where: { [field]: p.id } });
    if (!user) {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        // Only a provider-verified email may attach to an existing account.
        if (!p.emailVerified) return fail("oauth_unverified");
        user = await db.user.update({ where: { id: existing.id }, data: { [field]: p.id, emailVerifiedAt: existing.emailVerifiedAt ?? new Date() } });
      } else {
        user = await db.user.create({
          data: {
            email,
            name: p.name,
            [field]: p.id,
            emailVerifiedAt: p.emailVerified ? new Date() : null,
            passwordHash: await hashPassword(randomBytes(24).toString("hex")),
          },
        });
      }
    }
    await createSession(user.id);
    const hasProfile = await db.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
    return NextResponse.redirect(new URL(hasProfile ? "/dashboard" : "/onboarding", req.url));
  } catch (e) {
    log.error("oauth.callback_failed", { provider, message: String(e) });
    return fail("oauth_failed");
  }
}
