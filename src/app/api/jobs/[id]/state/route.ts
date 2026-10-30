import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";

const Body = z.object({
  saved: z.boolean().optional(),
  hidden: z.boolean().optional(),
  status: z.enum(["none", "interested", "applied", "interviewing", "offer", "rejected"]).optional(),
  notes: z.string().max(5000).optional(),
  appliedAt: z.string().datetime().nullable().optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().max(200).optional(),
  resumeVersionId: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const id = decodeURIComponent((await params).id);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  const job = await db.job.findUnique({ where: { id }, select: { id: true, importedById: true } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
  if (data.resumeVersionId && !(await db.resumeVersion.findFirst({ where: { id: data.resumeVersionId, userId: user.id } })))
    return jsonError("Resume version not found.", 404);

  const existing = await db.userJob.findUnique({ where: { userId_jobId: { userId: user.id, jobId: id } } });
  const patch = {
    ...data,
    appliedAt: data.appliedAt === undefined ? undefined : data.appliedAt ? new Date(data.appliedAt) : null,
    followUpAt: data.followUpAt === undefined ? undefined : data.followUpAt ? new Date(data.followUpAt) : null,
    // Moving to "applied" stamps the date if the user didn't set one.
    ...(data.status === "applied" && !existing?.appliedAt && data.appliedAt === undefined && { appliedAt: new Date() }),
    // A changed follow-up date re-arms the reminder.
    ...(data.followUpAt !== undefined && { followUpNotifiedAt: null }),
  };
  const state = await db.userJob.upsert({
    where: { userId_jobId: { userId: user.id, jobId: id } },
    create: { userId: user.id, jobId: id, ...patch },
    update: patch,
  });
  return NextResponse.json({ ok: true, state });
}
