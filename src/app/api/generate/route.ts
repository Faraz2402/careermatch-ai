import { NextResponse } from "next/server";
import { z } from "zod";
import { aiEnabled } from "@/lib/ai";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { generate, KINDS } from "@/lib/generate";
import { saveGeneration } from "@/lib/generations";
import { jobRowToNormalized, loadUserContext } from "@/lib/jobs/service";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limit

const Body = z.object({ jobId: z.string().min(1), kind: z.enum(KINDS), resumeVersionId: z.string().nullish() });

export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`gen:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many generations this hour. Try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  const job = await db.job.findUnique({ where: { id: data.jobId } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
  const { resume, prefs, hasProfile } = await loadUserContext(user.id, data.resumeVersionId);
  if (!hasProfile) return jsonError("Create your profile first.", 400);

  // Only real AI calls count toward the plan quota; templates are free.
  if (aiEnabled()) {
    const quota = await consumeAiAction(user, data.kind);
    if (!quota.ok) return jsonError(quota.message, 402);
  }

  const result = await generate(data.kind, resume, prefs, jobRowToNormalized(job));
  const row = await saveGeneration({ userId: user.id, jobId: job.id, kind: data.kind, content: result.content, engine: result.engine, resumeVersionId: data.resumeVersionId });
  return NextResponse.json({
    id: row.id,
    kind: data.kind,
    content: result.content,
    finalContent: null,
    engine: result.engine,
    warning: result.warning,
    createdAt: row.createdAt,
    resumeVersionId: row.resumeVersionId,
  });
}
