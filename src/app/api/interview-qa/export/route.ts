import { apiUser, jsonError } from "@/lib/api";
import { interviewDocx, interviewPdf } from "@/lib/interview-qa/export";
import { applyFilters, parseFilters, publishedQuestions } from "@/lib/interview-qa/store";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX = 300;

/** The current filtered set as a Word or PDF document (up to 300 questions). */
export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`iq-export:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many downloads - try again shortly.", 429);
  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "docx" ? "docx" : "pdf";
  const f = parseFilters(sp);
  const qs = applyFilters(await publishedQuestions(), f).slice(0, MAX);
  if (!qs.length) return jsonError("No questions match these filters.", 404);
  const scope = [f.departments, f.roles, f.companies, f.tools, f.skills, f.types].flatMap((x) => x ?? []).concat(f.q ? [`"${f.q}"`] : []);
  const title = "Interview Questions & Answers";
  const subtitle = `${qs.length} questions${scope.length ? ` · ${scope.join(", ")}` : ""} · CareerMatch AI · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
  const body = format === "pdf" ? await interviewPdf(title, subtitle, qs) : await interviewDocx(title, subtitle, qs);
  const name = `Interview_QA_${(scope[0] ?? "All").replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}.${format}`;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
