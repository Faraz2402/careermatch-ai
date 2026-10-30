// Node-only background jobs, loaded from instrumentation.ts. On serverless
// hosts set BACKGROUND_JOBS=false and call /api/cron/* on a schedule instead.

import { runAlerts } from "./lib/alerts";
import { cleanup, refreshSources } from "./lib/jobs/ingest";
import { reportError } from "./lib/log";

const g = globalThis as unknown as { __cmJobs?: boolean };

if (process.env.BACKGROUND_JOBS !== "false" && !g.__cmJobs) {
  g.__cmJobs = true; // dev hot-reload re-runs this module; schedule once
  const safe = (name: string, fn: () => Promise<unknown>) => () => void fn().catch((e) => reportError(e, { job: name }));
  setTimeout(safe("refresh", () => refreshSources()), 5_000);
  setInterval(safe("refresh", () => refreshSources()), 15 * 60_000);
  setInterval(safe("alerts", () => runAlerts()), 60 * 60_000);
  setInterval(safe("cleanup", () => cleanup()), 6 * 60 * 60_000);
}
