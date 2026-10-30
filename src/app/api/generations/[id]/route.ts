import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { sealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { SCHEMAS } from "@/lib/generate";
import { getGeneration } from "@/lib/generations";

const Body = z.object({ finalContent: z.unknown().nullable() });

/** Save the user-reviewed version of a generated document. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await params;
  const g = await getGeneration(user.id, id);
  if (!g) return jsonError("Not found.", 404);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  let finalContent: string | null = null;
  if (data.finalContent != null) {
    const parsed = SCHEMAS[g.kind].safeParse(data.finalContent);
    if (!parsed.success) return jsonError("The edited document is incomplete.");
    finalContent = sealJson(parsed.data);
  }
  await db.generation.update({ where: { id }, data: { finalContent } });
  return NextResponse.json({ ok: true });
}
