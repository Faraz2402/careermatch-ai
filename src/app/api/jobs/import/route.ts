import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { ImportError, importJobFromUrl, jobFromPastedText } from "@/lib/jobs/import-url";
import { jobId, persistJobs } from "@/lib/jobs/ingest";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.union([
  z.object({ url: z.string().url().max(2000) }),
  z.object({
    title: z.string().trim().min(2).max(200),
    company: z.string().trim().min(1).max(200),
    location: z.string().max(200).optional(),
    description: z.string().trim().min(50, "Paste the full job description").max(50_000),
    url: z.string().max(2000).optional(),
  }),
]);

export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`import:${user.id}`, 20, 60 * 60_000)).ok) return jsonError("Import limit reached. Try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  try {
    const job = "title" in data ? jobFromPastedText(data) : await importJobFromUrl(data.url);
    // Namespace by user so one person's import is never shown to another.
    job.externalId = `${user.id.slice(-8)}-${job.externalId}`;
    const id = jobId(job);
    await persistJobs([job], { importedById: user.id });
    await db.userJob.upsert({
      where: { userId_jobId: { userId: user.id, jobId: id } },
      create: { userId: user.id, jobId: id, saved: true },
      update: { saved: true, hidden: false },
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    if (err instanceof ImportError) return jsonError(err.message, 422);
    console.error("[jobs/import]", err);
    return jsonError("Couldn't import that job. Paste the description instead.", 502);
  }
}
