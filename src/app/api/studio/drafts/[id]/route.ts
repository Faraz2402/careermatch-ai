import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { ResumeDataSchema } from "@/lib/resume/schema";
import { deleteDraft, getDraft, saveDraft, type StoredState } from "@/lib/tailor/drafts";
import { recompute, withResume } from "@/lib/tailor/engine";
import { isVisual } from "@/lib/tailor/http";
import { TEMPLATES } from "@/lib/templates/catalog";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const d = await getDraft(user.id, (await params).id);
  return d ? NextResponse.json(d) : jsonError("Not found.", 404);
}

const Letter = z.object({ subject: z.string().max(300), greeting: z.string().max(200), paragraphs: z.array(z.string().max(3000)).max(8), closing: z.string().max(100), signature: z.string().max(120), tone: z.string(), length: z.string() });

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  templateId: z.enum(TEMPLATES.map((t) => t.id) as [string, ...string[]]).optional(),
  selected: z.array(z.string()).max(100).optional(),
  learning: z.array(z.string()).max(100).optional(),
  changes: z.array(z.object({ id: z.string(), status: z.enum(["pending", "accepted", "rejected"]).optional(), proposed: z.string().max(1200).optional() })).max(200).optional(),
  acceptAll: z.boolean().optional(),
  resume: ResumeDataSchema.optional(),
  personal: z.record(z.string(), z.string().max(200)).optional(),
  // A small square JPEG made in the browser (about 40 KB); null removes it.
  photo: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/).max(200_000).nullable().optional(),
  letter: Letter.nullable().optional(),
  restore: z.union([z.literal("base"), z.number().int().nonnegative()]).optional(),
  design: z
    .object({
      font: z.enum(["sans", "serif"]).optional(),
      density: z.enum(["airy", "standard", "compact"]).optional(),
      accent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
      order: z.array(z.enum(["summary", "skills", "experience", "projects", "education", "certifications", "personal", "languages"])).max(8).optional(),
    })
    .optional(),
});

/** Every edit in the Studio: selections, change decisions, manual edits, template, letter, restore. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const id = (await params).id;
  const { data, error: bodyError } = await readBody(req, Patch);
  if (bodyError) return bodyError;
  const d = await getDraft(user.id, id);
  if (!d) return jsonError("Not found.", 404);

  const templateId = data.templateId ?? d.templateId;
  const visual = isVisual(templateId);
  let s: StoredState = { ...d.state };
  const snapshot = (label: string) => (s = { ...s, history: [...s.history, { at: new Date().toISOString(), label, resume: s.resume }].slice(-20) });

  if (data.selected) s.selected = data.selected.filter((x) => s.matches.some((m) => m.requirement.id === x));
  if (data.learning) s.learning = data.learning.filter((x) => s.matches.some((m) => m.requirement.id === x) && !s.selected.includes(x));
  if (data.changes || data.acceptAll) {
    snapshot("Before change decisions");
    const edits = new Map((data.changes ?? []).map((c) => [c.id, c]));
    s.changes = s.changes.map((c) => {
      const e = edits.get(c.id);
      return { ...c, ...(data.acceptAll && c.status === "pending" ? { status: "accepted" as const } : {}), ...(e?.status ? { status: e.status } : {}), ...(e?.proposed !== undefined ? { proposed: e.proposed } : {}) };
    });
  }
  if (data.selected || data.learning || data.changes || data.acceptAll) s = { ...s, ...recompute(s, { visual }) };
  if (data.resume) {
    snapshot("Before manual edit");
    s = { ...s, ...withResume(s, data.resume, { visual }) };
  }
  if (data.restore !== undefined) {
    const target = data.restore === "base" ? s.baseResume : s.history[data.restore]?.resume;
    if (!target) return jsonError("Nothing to restore.", 400);
    snapshot("Before restore");
    if (data.restore === "base") s.changes = s.changes.map((c) => ({ ...c, status: "pending" as const }));
    s = { ...s, ...withResume(s, structuredClone(target), { visual }) };
  }
  if (data.personal) s.personal = data.personal;
  if (data.photo !== undefined) s.photo = data.photo ?? undefined;
  if (data.design) s.design = { ...s.design, ...data.design };
  if (data.letter !== undefined) s.letter = data.letter;
  // A template change can move the parsing score (visual layouts).
  if (data.templateId && !data.resume && !data.restore) s = { ...s, ...withResume(s, s.resume, { visual }) };

  const saved = await saveDraft(user.id, id, { name: data.name, templateId: data.templateId, state: s });
  return saved ? NextResponse.json(saved) : jsonError("Not found.", 404);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  return (await deleteDraft(user.id, (await params).id)) ? NextResponse.json({ ok: true }) : jsonError("Not found.", 404);
}
