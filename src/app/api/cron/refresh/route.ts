import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { refreshSources } from "@/lib/jobs/ingest";

export const maxDuration = 300;

/** Refresh job sources whose cache window has expired. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  return NextResponse.json(await refreshSources());
}
