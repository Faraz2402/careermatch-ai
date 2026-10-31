import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { runDailyDigests } from "@/lib/daily-digest";
import { reportError } from "@/lib/log";

export const maxDuration = 60;

/**
 * 7:00 AM IST (01:30 UTC): each Pro member's best new matches by email.
 * Operators can preview with ?only=<email>&force=1 (same cron secret).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  const p = new URL(req.url).searchParams;
  try {
    return NextResponse.json(await runDailyDigests({ onlyEmail: p.get("only") ?? undefined, force: p.get("force") === "1" }));
  } catch (e) {
    await reportError(e, { job: "digest" });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
