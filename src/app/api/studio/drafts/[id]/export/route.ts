import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { claimExport } from "@/lib/plans";
import { exportChecklist } from "@/lib/tailor/checklist";
import { canUseTemplate, getDraft } from "@/lib/tailor/drafts";
import { templateById } from "@/lib/templates/catalog";
import { buildDoc, styledTemplate } from "@/lib/templates/model";
import { atsVariant, exportName, mergePdfs, pdfDrops, renderLetterDocx, renderLetterPdf, renderResumeDocx, renderResumePdf } from "@/lib/templates/render";

export const runtime = "nodejs";

const MIME = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } as const;

/**
 * GET ?doc=resume|letter|pack&format=pdf|docx[&ats=1][&check=1]
 * check=1 returns the pre-export checklist as JSON instead of a file.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const p = new URL(req.url).searchParams;
  const doc = p.get("doc") === "letter" ? "letter" : p.get("doc") === "pack" ? "pack" : "resume";
  const format = p.get("format") === "docx" && doc !== "pack" ? "docx" : "pdf";
  const d = await getDraft(user.id, (await params).id);
  if (!d) return jsonError("Not found.", 404);
  const s = d.state;
  const chosen = templateById(d.templateId);
  const template = styledTemplate(p.get("ats") === "1" ? atsVariant(chosen) : chosen, s.design);
  const confirmed = [...s.selected, ...s.learning].map((x) => s.matches.find((m) => m.requirement.id === x)?.requirement.keyword ?? "").filter(Boolean);

  if (p.get("check") === "1") {
    const allText = JSON.stringify(s.resume);
    return NextResponse.json({ checks: exportChecklist({ tailored: s.resume, base: s.baseResume, template, personal: s.personal, confirmed, format, nonLatinDropped: pdfDrops(allText) }) });
  }

  if (!canUseTemplate(user, chosen.id)) return Response.redirect(new URL("/pricing?limit=template", req.url), 303);
  if ((doc === "letter" || doc === "pack") && !s.letter) return jsonError("Write the cover letter first.", 400);
  // Free plan: one tailored résumé and one cover letter (re-downloads are free).
  if ((doc === "resume" || doc === "pack") && !(await claimExport(user, "resume", `studio:${d.id}`))) return Response.redirect(new URL("/pricing?limit=export", req.url), 303);
  if ((doc === "letter" || doc === "pack") && !(await claimExport(user, "cover_letter", `studio:${d.id}`))) return Response.redirect(new URL("/pricing?limit=export", req.url), 303);

  const model = buildDoc(s.resume, template, s.personal, { pdf: format === "pdf", order: s.design?.order, photo: s.photo });
  let body: Uint8Array | Buffer;
  if (doc === "resume") body = format === "pdf" ? await renderResumePdf(model) : await renderResumeDocx(model);
  else if (doc === "letter") body = format === "pdf" ? await renderLetterPdf(s.letter!, model) : await renderLetterDocx(s.letter!, model);
  else body = await mergePdfs([await renderResumePdf(model), await renderLetterPdf(s.letter!, model)]);

  const name = exportName(s.resume.name, s.source.title, s.source.company, doc === "resume" ? "CV" : doc === "letter" ? "Cover_Letter" : "Application", format);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": MIME[format], "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
