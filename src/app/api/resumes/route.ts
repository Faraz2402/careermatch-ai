import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { sealJson, unsealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { PLANS, planOf } from "@/lib/plans";
import { getBaseResume } from "@/lib/profile";
import type { ResumeData } from "@/lib/resume/schema";

export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const rows = await db.resumeVersion.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({
    versions: rows.map((v) => ({ id: v.id, name: v.name, updatedAt: v.updatedAt, data: unsealJson<ResumeData | null>(v.data, null) })),
  });
}

const Body = z.object({ name: z.string().trim().min(1).max(80), fromVersionId: z.string().optional() });

/** Create a named resume version, copied from the profile or another version. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const limit = PLANS[planOf(user)].resumeVersions;
  if ((await db.resumeVersion.count({ where: { userId: user.id } })) >= limit)
    return jsonError(`Your plan allows ${limit} resume versions. Delete one or upgrade.`, 403);
  const base = await getBaseResume(user.id, data.fromVersionId);
  if (!base) return jsonError("Create your profile first.");
  const v = await db.resumeVersion.create({ data: { userId: user.id, name: data.name, data: sealJson(base.data) } });
  return NextResponse.json({ id: v.id });
}
