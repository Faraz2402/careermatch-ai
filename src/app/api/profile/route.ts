import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { seal, sealJson } from "@/lib/crypto";
import { db } from "@/lib/db";
import { getProfile, saveParsedProfile, slugAvailable, THEMES } from "@/lib/profile";
import { ResumeDataSchema, VisibilitySchema } from "@/lib/resume/schema";

export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const p = await getProfile(user.id);
  if (!p) return NextResponse.json({ profile: null });
  return NextResponse.json({
    profile: { slug: p.slug, isPublic: p.isPublic, theme: p.theme, views: p.views, data: p.data, visibility: p.visibility, parsedBy: p.parsedBy },
  });
}

const Body = z.object({
  data: ResumeDataSchema.optional(),
  resumeText: z.string().max(100_000).optional(),
  parsedBy: z.string().max(60).optional(),
  visibility: VisibilitySchema.optional(),
  isPublic: z.boolean().optional(),
  theme: z.enum(THEMES).optional(),
  slug: z.string().trim().toLowerCase().optional(),
});

export async function PUT(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data: body, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  let profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    if (!body.data) return jsonError("Upload a resume first.");
    profile = await saveParsedProfile(user.id, body.data, body.resumeText ?? "", body.parsedBy ?? "manual");
  }

  if (body.slug !== undefined && body.slug !== profile.slug) {
    if (!(await slugAvailable(body.slug, user.id)))
      return jsonError("That URL is taken or invalid. Use 3-40 lowercase letters, numbers or dashes.", 409);
  }

  const updated = await db.profile.update({
    where: { userId: user.id },
    data: {
      // Changing the resume invalidates its cached embedding.
      ...(body.data && { data: sealJson(body.data), embedding: null }),
      ...(body.resumeText !== undefined && { resumeText: body.resumeText ? seal(body.resumeText) : "" }),
      ...(body.parsedBy && { parsedBy: body.parsedBy }),
      ...(body.visibility && { visibility: JSON.stringify(body.visibility) }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.theme && { theme: body.theme }),
      ...(body.slug && { slug: body.slug }),
    },
  });
  return NextResponse.json({ ok: true, slug: updated.slug, isPublic: updated.isPublic });
}
