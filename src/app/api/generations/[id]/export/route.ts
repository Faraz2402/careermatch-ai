import { apiUser, jsonError } from "@/lib/api";
import { fileName, renderDocx, renderPdf, TEMPLATES, type Template } from "@/lib/export/documents";
import { exportDocFor, getGeneration } from "@/lib/generations";
import { claimResumeExport } from "@/lib/plans";

export const runtime = "nodejs";

/** GET ?format=pdf|docx&template=classic|modern|compact */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { id } = await params;
  const p = new URL(req.url).searchParams;
  const format = p.get("format") === "docx" ? "docx" : "pdf";
  const template = (TEMPLATES as readonly string[]).includes(p.get("template") ?? "") ? (p.get("template") as Template) : "classic";

  const g = await getGeneration(user.id, id);
  if (!g) return jsonError("Not found.", 404);
  const doc = await exportDocFor(user.id, g);
  if (!doc) return jsonError("Only resumes and cover letters can be exported.", 400);
  // Free plan: one tailored résumé can be exported (cover letters are unlimited).
  if (g.kind === "ats_resume" && !(await claimResumeExport(user, g.id))) {
    return Response.redirect(new URL("/pricing?limit=export", req.url), 303);
  }

  const body = format === "pdf" ? await renderPdf(doc, template) : await renderDocx(doc, template);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName(doc, format)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
