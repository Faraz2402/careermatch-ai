import { NextResponse } from "next/server";
import { z } from "zod";
import { apiAdmin, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { ALL_SOURCES, invalidateSourceCache } from "@/lib/jobs/registry";

const Body = z.object({
  /** null clears the override (back to JOB_SOURCES_ENABLED) */
  enabled: z.boolean().nullable().optional(),
  /** comma-separated board tokens; null clears the override (back to env) */
  boards: z
    .string()
    .max(2000)
    .regex(/^[\w,\s-]*$/, "Board tokens may only contain letters, numbers, dashes and commas.")
    .nullable()
    .optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiAdmin();
  if (error) return error;
  const { id } = await params;
  if (!ALL_SOURCES.some((s) => s.id === id)) return jsonError("Unknown source.", 404);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const boards = data.boards === undefined ? undefined : data.boards === null ? null : data.boards.split(",").map((b) => b.trim()).filter(Boolean).join(",");
  await db.sourceSetting.upsert({
    where: { id },
    create: { id, enabled: data.enabled ?? null, boards: boards ?? null },
    update: { ...(data.enabled !== undefined && { enabled: data.enabled }), ...(boards !== undefined && { boards }) },
  });
  invalidateSourceCache();
  log.info("admin.source_updated", { by: user.id, source: id, ...data });
  return NextResponse.json({ ok: true });
}
