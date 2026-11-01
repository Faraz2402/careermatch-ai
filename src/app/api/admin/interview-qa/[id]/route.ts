import { NextResponse } from "next/server";
import { z } from "zod";
import { apiAdmin, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { invalidateInterviewCache } from "@/lib/interview-qa/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ action: z.enum(["approve", "reject"]) });

/** Approve (publish) or reject a user-reported question. */
export async function POST(req: Request, { params }: Ctx) {
  const { error } = await apiAdmin();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const id = decodeURIComponent((await params).id);
  const row = await db.interviewQuestion.findFirst({ where: { id, source: "user" } });
  if (!row) return jsonError("Not found.", 404);
  await db.interviewQuestion.update({ where: { id }, data: { status: data.action === "approve" ? "published" : "rejected" } });
  invalidateInterviewCache();
  return NextResponse.json({ ok: true });
}
