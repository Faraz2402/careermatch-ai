import { NextResponse } from "next/server";
import { runAlerts } from "@/lib/alerts";
import { cronAuthorized, cronDenied } from "@/lib/cron";

export const maxDuration = 60; // Vercel Hobby limit

/** Saved-search digests and application follow-up reminders. */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  return NextResponse.json(await runAlerts());
}
