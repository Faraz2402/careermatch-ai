import { jsonError } from "@/lib/api";
import { COUNTRY_NAMES, formatFor, roleOf, sampleById } from "@/lib/resume-examples/data";
import { examplePdf } from "@/lib/resume-examples/pdf";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Download one fictional sample as a PDF in its country's paper size. Reads saved data only. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = sampleById((await params).id);
  if (!s) return jsonError("Sample not found.", 404);
  if (!(await rateLimit(`rx-pdf:${clientIp(req)}`, 60, 60 * 60_000)).ok) return jsonError("Too many downloads - try again shortly.", 429);
  const format = formatFor(s.country);
  const bytes = await examplePdf(s, format);
  const name = `${roleOf(s.role)?.name ?? s.role} ${format.term === "CV" ? "CV" : "Resume"} ${COUNTRY_NAMES[s.country]} ${s.level} (fictional sample)`.replace(/[^A-Za-z0-9()]+/g, "_");
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}.pdf"`, "Cache-Control": "public, max-age=86400" },
  });
}
