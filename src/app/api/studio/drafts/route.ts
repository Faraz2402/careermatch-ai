import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { getBaseResume } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { canCreateDraft, createDraft, listDrafts } from "@/lib/tailor/drafts";
import { recompute, startState } from "@/lib/tailor/engine";
import { aiAllowance, defaultTemplateFor, isVisual } from "@/lib/tailor/http";
import { templateById } from "@/lib/templates/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  return NextResponse.json({ drafts: await listDrafts(user.id) });
}

const Body = z.object({
  jobId: z.string().min(1).nullish(),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  description: z.string().max(40_000).optional(),
  baseId: z.string().nullish(),
  templateId: z.string().optional(),
});

/** Start a tailored application from a saved job or a pasted job description. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`studio:new:${user.id}`, 20, 60 * 60_000)).ok) return jsonError("Too many new applications this hour. Try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  const allowed = await canCreateDraft(user);
  if (!allowed.ok) return jsonError(allowed.message, 402, { upgrade: true });

  let source = { jobId: null as string | null, title: data.title?.trim() ?? "", company: data.company?.trim() ?? "", description: data.description?.trim() ?? "", location: "" };
  let country: string | null = null;
  if (data.jobId) {
    const job = await db.job.findUnique({ where: { id: data.jobId } });
    if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
    source = { jobId: job.id, title: job.title, company: job.company, description: job.description, location: job.location };
    country = job.country;
  }
  if (source.description.length < 80) return jsonError("Paste the full job description (at least a few lines) so it can be analysed.");
  if (!source.title) source.title = source.description.split("\n")[0].slice(0, 120);

  const base = await getBaseResume(user.id, data.baseId);
  if (!base) return jsonError("Add your résumé first: upload it on the Profile page or in the Studio.", 400);

  const templateId = templateById(data.templateId ?? defaultTemplateFor(country)).id;
  const ai = await aiAllowance(user, "studio:analyse");
  const state = await startState({ source, base: base.data, baseName: base.name, useAi: ai.useAi });
  const full = recompute({ ...state, warnings: [...state.warnings, ...(ai.note ? [ai.note] : [])] }, { visual: isVisual(templateId) });
  const draft = await createDraft(user.id, { name: `${source.title}${source.company ? ` · ${source.company}` : ""}`, jobId: source.jobId, templateId, state: { ...full, personal: {} } });
  return NextResponse.json(draft, { status: 201 });
}
