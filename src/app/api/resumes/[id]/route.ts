import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { sealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { ResumeDataSchema } from "@/lib/resume/schema";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ name: z.string().trim().min(1).max(80).optional(), data: ResumeDataSchema.optional() });

export async function PUT(req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await params;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const res = await db.resumeVersion.updateMany({
    where: { id, userId: user.id },
    data: { ...(data.name && { name: data.name }), ...(data.data && { data: sealJson(data.data) }) },
  });
  if (res.count === 0) return jsonError("Not found.", 404);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await params;
  await db.resumeVersion.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
