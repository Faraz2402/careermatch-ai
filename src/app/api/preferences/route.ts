import { NextResponse } from "next/server";
import { apiUser, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { PreferencesSchema } from "@/lib/resume/schema";

export async function PUT(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, PreferencesSchema);
  if (bodyError) return bodyError;
  const json = JSON.stringify(data);
  await db.preferences.upsert({ where: { userId: user.id }, create: { userId: user.id, data: json }, update: { data: json } });
  return NextResponse.json({ ok: true });
}
