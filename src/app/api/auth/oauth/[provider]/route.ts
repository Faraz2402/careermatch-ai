import { NextResponse } from "next/server";
import { isProvider, OAUTH_COOKIE, providerEnabled, startAuth } from "@/lib/oauth";

/** Starts "Continue with Google / Microsoft / LinkedIn". */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider) || !providerEnabled(provider)) return NextResponse.redirect(new URL("/login?error=oauth_disabled", req.url));
  const { url, cookie } = startAuth(provider);
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: `/api/auth/oauth/${provider}`, maxAge: 600 });
  return res;
}
