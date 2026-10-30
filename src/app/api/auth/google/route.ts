import { NextResponse } from "next/server";
import { googleEnabled, OAUTH_COOKIE, startGoogleAuth } from "@/lib/google-oauth";

export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/login?error=google_disabled", req.url));
  const { url, cookie } = startGoogleAuth();
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 600 });
  return res;
}
