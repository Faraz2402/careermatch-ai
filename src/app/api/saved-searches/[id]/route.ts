import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ name: z.string().trim().min(1).max(80).optional(), frequency: z.enum(["off", "daily", "weekly"]).optional() });

export async function PUT(req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const r = await db.savedSearch.updateMany({ where: { id: (await params).id, userId: user.id }, data });
  return r.count ? NextResponse.json({ ok: true }) : jsonError("Not found.", 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  await db.savedSearch.deleteMany({ where: { id: (await params).id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
