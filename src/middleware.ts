import { NextResponse, type NextRequest } from "next/server";

// Cheap edge check for a session cookie; the real session validation happens
// server-side in requireUser()/apiUser().
const PROTECTED = ["/dashboard", "/interview-qa", "/onboarding", "/profile", "/preferences", "/jobs", "/sources", "/applications", "/alerts", "/resumes", "/settings", "/admin", "/import", "/tools", "/dev"];
const AUTH_PAGES = ["/login", "/signup"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has("cm_session");
  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_PAGES.includes(pathname)) return NextResponse.redirect(new URL("/dashboard", req.url));
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/billing/webhook).*)"] };
