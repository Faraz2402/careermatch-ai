import { NextResponse } from "next/server";
import { cronAuthorized, cronDenied } from "@/lib/cron";
import { hydrateDescriptions } from "@/lib/jobs/hydrate";

export const maxDuration = 60;

/** Load the complete description of new snippet-only listings (background task). */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return cronDenied();
  return NextResponse.json(await hydrateDescriptions({ budgetMs: 50_000 }));
}
