import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { aiEnabled } from "@/lib/ai";
import { db } from "@/lib/db";
import { readRequirementsBatch } from "@/lib/jobs/enrich";
import { scoreJob } from "@/lib/jobs/rank";
import { jobRowToNormalized, loadMatchContext } from "@/lib/jobs/service";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ ids: z.array(z.string().max(200)).min(1).max(25) });

/** Read the skills of the listed jobs (one AI call) and return updated matches. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  if (!aiEnabled()) return jsonError("AI is not configured.", 503);
  if (!(await rateLimit(`requirements:${user.id}`, 60, 60 * 60_000)).ok) return jsonError("Too many requests - please wait a few minutes.", 429);

  const where = { id: { in: data.ids }, OR: [{ importedById: null }, { importedById: user.id }] };
  try {
    await readRequirementsBatch(await db.job.findMany({ where }));
  } catch (e) {
    log.warn("requirements.batch_failed", { error: String(e) });
  }
  const [rows, ctx] = await Promise.all([db.job.findMany({ where }), loadMatchContext(user.id)]);
  return NextResponse.json({
    jobs: rows.map((r) => {
      const j = jobRowToNormalized(r);
      return { id: r.id, match: scoreJob(j, ctx) };
    }),
  });
}
