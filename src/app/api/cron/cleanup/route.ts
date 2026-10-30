import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { cleanup } from "@/lib/jobs/ingest";

/** Data retention: stale listings, expired demo accounts and tokens. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  return NextResponse.json(await cleanup());
}
