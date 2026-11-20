import { after, NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { hydrateDescriptions } from "@/lib/jobs/hydrate";
import { refreshSources } from "@/lib/jobs/ingest";
import { reportError } from "@/lib/log";

export const maxDuration = 60;

/** Everything must finish inside the 60s function limit, with room to spare. */
const TOTAL_BUDGET_MS = 54_000;

/**
 * The frequent background tick (every ~15 minutes from the GitHub Actions
 * schedule in .github/workflows/background.yml): refresh the sources whose
 * cache window has passed, then spend the rest of the time loading complete
 * descriptions. Vercel Hobby only allows one daily cron, so this keeps
 * listings live while nobody is on the site, and keeps the database active.
 *
 * Replies at once and works after the response, so the caller never waits
 * on (or times out because of) a slow source.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  const started = Date.now();
  after(async () => {
    try {
      await refreshSources({ budgetMs: 22_000 });
    } catch (e) {
      await reportError(e, { job: "tick.refresh" });
    }
    const left = TOTAL_BUDGET_MS - (Date.now() - started);
    if (left < 8_000) return;
    try {
      await hydrateDescriptions({ budgetMs: left });
    } catch (e) {
      await reportError(e, { job: "tick.hydrate" });
    }
  });
  return NextResponse.json({ ok: true, queued: ["refresh", "descriptions"] });
}
