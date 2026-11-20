import { NextResponse } from "next/server";
import { isProvider, OAUTH_COOKIE, providerEnabled, startAuth } from "@/lib/oauth";
import { appUrl } from "@/lib/site-url";

/** Starts "Continue with Google / Microsoft / LinkedIn". */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider) || !providerEnabled(provider)) return NextResponse.redirect(new URL("/login?error=oauth_disabled", req.url));
  // The provider returns to the canonical host, so the state cookie must be set
  // there too. Started from www. or a *.vercel.app alias? Restart on the canonical host.
  const here = new URL(req.url);
  const canonical = new URL(appUrl());
  const forwardedHost = req.headers.get("x-forwarded-host") ?? here.host;
  if (forwardedHost !== canonical.host && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL(`${here.pathname}${here.search}`, canonical));
  }
  const { url, cookie } = startAuth(provider);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: `/api/auth/oauth/${provider}`, maxAge: 600 });
  return res;
}
