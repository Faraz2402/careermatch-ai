import { NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { cleanup, refreshSources } from "@/lib/jobs/ingest";
import { reportError } from "@/lib/log";

export const maxDuration = 60; // Vercel Hobby limit

/**
 * One daily job for hosts that only allow a single cron (Vercel Hobby):
 * refresh sources, send alerts, then apply data retention.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  const run = async <T,>(name: string, fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (e) {
      await reportError(e, { job: name });
      return { error: String(e) };
    }
  };
  // A shorter budget leaves time for alerts and cleanup; deferred sources refresh on later calls.
  const refresh = await run("refresh", () => refreshSources({ budgetMs: 30_000 }));
  const alerts = await run("alerts", () => runAlerts());
  const retention = await run("cleanup", () => cleanup());
  return NextResponse.json({ refresh, alerts, retention });
}
