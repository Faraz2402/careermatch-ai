import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { ensureFullDescription } from "@/lib/jobs/hydrate";
import { scoreJob } from "@/lib/jobs/rank";

export const maxDuration = 30;
import { jobRowToNormalized, loadMatchContext, toCard } from "@/lib/jobs/service";

/** Job details for the discovery side panel. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const id = decodeURIComponent((await params).id);
  const found = await db.job.findUnique({ where: { id } });
  if (!found || (found.importedById && found.importedById !== user.id)) return jsonError("Job not found.", 404);
  // Complete description first, then the score is computed from it.
  const [row, ctx, state] = await Promise.all([ensureFullDescription(found, 10_000), loadMatchContext(user.id), db.userJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } })]);
  const job = jobRowToNormalized(row);
  return NextResponse.json({ job: toCard(job, scoreJob(job, ctx), state ?? undefined), description: job.description, lastSeenAt: row.lastSeenAt });
}
