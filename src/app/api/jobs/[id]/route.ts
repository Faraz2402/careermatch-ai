import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { scoreJob } from "@/lib/jobs/rank";
import { jobRowToNormalized, loadMatchContext, toCard } from "@/lib/jobs/service";

/** Job details for the discovery side panel. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const id = decodeURIComponent((await params).id);
  const row = await db.job.findUnique({ where: { id } });
  if (!row || (row.importedById && row.importedById !== user.id)) return jsonError("Job not found.", 404);
  const [ctx, state] = await Promise.all([loadMatchContext(user.id), db.userJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } })]);
  const job = jobRowToNormalized(row);
  return NextResponse.json({ job: toCard(job, scoreJob(job, ctx), state ?? undefined), description: job.description, lastSeenAt: row.lastSeenAt });
}
