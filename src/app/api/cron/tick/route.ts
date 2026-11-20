import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { hydrateDescriptions } from "@/lib/jobs/hydrate";
import { refreshSources } from "@/lib/jobs/ingest";
import { reportError } from "@/lib/log";

export const maxDuration = 60;

/**
 * The frequent background tick (every ~15 minutes from the GitHub Actions
 * schedule in .github/workflows/background.yml): refresh the sources whose
 * cache window has passed, then spend the rest of the time loading complete
 * descriptions. Vercel Hobby only allows one daily cron, so this keeps
 * listings live while nobody is on the site. It also keeps the database
 * active, so a free database plan never pauses it for inactivity.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  const started = Date.now();
  const refresh = await refreshSources({ budgetMs: 25_000 }).catch(async (e) => {
    await reportError(e, { job: "tick.refresh" });
    return { error: String(e) };
  });
  const hydrate = await hydrateDescriptions({ budgetMs: Math.max(10_000, 52_000 - (Date.now() - started)) }).catch(async (e) => {
    await reportError(e, { job: "tick.hydrate" });
    return { error: String(e) };
  });
  return NextResponse.json({ refresh, hydrate });
}
