import "server-only";
import { sealJson, unsealJson } from "./crypto";
import { db } from "./db";
import { contactLine, resumeDocFromProfile, type ExportDoc } from "./export/documents";
import type { GenerationOutput, Kind } from "./generate";
import { getBaseResume } from "./profile";

export async function saveGeneration(input: { userId: string; jobId: string; kind: Kind; content: unknown; engine: string; resumeVersionId?: string | null }) {
  return db.generation.create({
    data: { userId: input.userId, jobId: input.jobId, kind: input.kind, content: sealJson(input.content), engine: input.engine, resumeVersionId: input.resumeVersionId ?? null },
  });
}

export type GenerationView = {
  id: string;
  kind: Kind;
  content: unknown;
  finalContent: unknown | null;
  engine: string;
  createdAt: string;
  resumeVersionId: string | null;
};

export function decodeGeneration(g: { id: string; kind: string; content: string; finalContent: string | null; engine: string; createdAt: Date; resumeVersionId: string | null }): GenerationView {
  return {
    id: g.id,
    kind: g.kind as Kind,
    content: unsealJson(g.content, null),
    finalContent: g.finalContent ? unsealJson(g.finalContent, null) : null,
    engine: g.engine,
    createdAt: g.createdAt.toISOString(),
    resumeVersionId: g.resumeVersionId,
  };
}

export async function getGeneration(userId: string, id: string) {
  const g = await db.generation.findFirst({ where: { id, userId } });
  return g ? decodeGeneration(g) : null;
}

/** Build an exportable document from an ATS resume or cover letter. */
export async function exportDocFor(userId: string, g: GenerationView): Promise<ExportDoc | null> {
  const base = await getBaseResume(userId, g.resumeVersionId);
  if (!base) return null;
  const r = base.data;
  const c = (g.finalContent ?? g.content) as GenerationOutput[Kind];
  if (g.kind === "cover_letter") {
    const l = c as GenerationOutput["cover_letter"];
    return { kind: "letter", name: r.name, contact: contactLine(r), subject: l.subject, body: l.body };
  }
  if (g.kind === "ats_resume") {
    const a = c as GenerationOutput["ats_resume"];
    return {
      ...resumeDocFromProfile(r),
      headline: a.headline,
      summary: a.summary,
      skills: a.skills,
      experience: a.experience,
      education: a.education.length ? a.education : resumeDocFromProfile(r).education,
      certifications: a.certifications.length ? a.certifications : resumeDocFromProfile(r).certifications,
    };
  }
  return null;
}
