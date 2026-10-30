import { fileName, renderPdf, resumeDocFromProfile } from "@/lib/export/documents";
import { loadPublicProfile } from "@/lib/public-profile";

export const runtime = "nodejs";

/** Public "Download resume" - built only from the fields the owner made visible. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = await loadPublicProfile((await params).slug);
  if (!p) return new Response("Not found", { status: 404 });
  const doc = resumeDocFromProfile(p.data);
  const pdf = await renderPdf(doc, p.theme === "minimal" ? "classic" : "modern");
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName(doc, "pdf")}"`, "Cache-Control": "private, max-age=300" },
  });
}
