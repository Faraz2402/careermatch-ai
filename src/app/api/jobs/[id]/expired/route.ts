import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ expired: z.boolean() });

/** Report a listing as no longer accepting applications (or undo it). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (user.isDemo) return jsonError("Create a free account to report listings.", 403);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  if (!(await rateLimit(`expire:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many reports - please try again later.", 429);

  const id = decodeURIComponent((await params).id);
  const job = await db.job.findUnique({ where: { id }, select: { id: true, importedById: true } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);

  const updated = await db.job.update({
    where: { id },
    data: data.expired ? { expiredAt: new Date(), expiredBy: user.id } : { expiredAt: null, expiredBy: null },
    select: { expiredAt: true },
  });
  return NextResponse.json({ expiredAt: updated.expiredAt?.toISOString() ?? null });
}
