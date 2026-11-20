import { after, NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { hydrateDescriptions } from "@/lib/jobs/hydrate";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Sent by the browser when a signed-in user switches away from the tab (or
 * leaves it idle): load complete descriptions for new listings while they're
 * away, so the next visit shows full postings and full-text scores.
 * Responds at once; the work continues after the response.
 */
export async function POST() {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`hydrate:${user.id}`, 6, 60 * 60_000)).ok) return NextResponse.json({ queued: false }, { status: 202 });
  after(() => hydrateDescriptions({ budgetMs: 45_000 }).catch(() => undefined));
  return NextResponse.json({ queued: true }, { status: 202 });
}
