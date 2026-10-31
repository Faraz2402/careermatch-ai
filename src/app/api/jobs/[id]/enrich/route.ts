import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { aiEnabled } from "@/lib/ai";
import { db } from "@/lib/db";
import { enrichJob, needsEnrichment } from "@/lib/jobs/enrich";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Find the original posting, full description, requirements and market pay. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const id = decodeURIComponent((await params).id);
  const job = await db.job.findUnique({ where: { id } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
  if (!aiEnabled()) return jsonError("AI is not configured.", 503);
  if (!needsEnrichment(job)) return NextResponse.json({ ok: true, cached: true });
  if (!(await rateLimit(`enrich:${user.id}`, 40, 60 * 60_000)).ok) return jsonError("You've opened a lot of jobs - please wait a few minutes.", 429);

  // Another tab may be enriching the same job; claim it first.
  const claimed = await db.job.updateMany({ where: { id, enrichedAt: job.enrichedAt }, data: { enrichedAt: new Date() } });
  if (claimed.count === 0) return NextResponse.json({ ok: true, cached: true });
  try {
    await enrichJob(job, true);
  } catch (e) {
    await db.job.update({ where: { id }, data: { enrichedAt: job.enrichedAt } }); // let a later visit retry
    throw e;
  }
  return NextResponse.json({ ok: true, cached: false });
}
