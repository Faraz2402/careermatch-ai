import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { runDailyDigests } from "@/lib/daily-digest";
import { refreshInterviewQuestions } from "@/lib/interview-qa/ingest";
import { reportError } from "@/lib/log";

export const maxDuration = 60;

/**
 * 7:00 AM IST (01:30 UTC): each Pro member's best new matches by email, then the
 * Interview Q&A collections refresh when due.
 * Operators can preview with ?only=<email>&force=1 (same cron secret).
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  const p = new URL(req.url).searchParams;
  let digests: unknown;
  try {
    digests = await runDailyDigests({ onlyEmail: p.get("only") ?? undefined, force: p.get("force") === "1" });
  } catch (e) {
    await reportError(e, { job: "digest" });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  // Interview Q&A collections refresh here too (only when they're a few days old; takes seconds).
  let interviewQa: unknown;
  try {
    interviewQa = await refreshInterviewQuestions({ budgetMs: 20_000 });
  } catch (e) {
    await reportError(e, { job: "interview-qa" });
    interviewQa = { error: String(e) };
  }
  return NextResponse.json({ digests, interviewQa });
}
