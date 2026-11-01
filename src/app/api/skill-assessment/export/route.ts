import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { DIFFICULTIES } from "@/lib/interview-qa/assessment";
import { assessmentDocx, assessmentPdf, assessmentPdfUnsupported } from "@/lib/interview-qa/assessment-export";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const s = (max: number) => z.string().max(max);
const Body = z.object({
  format: z.enum(["pdf", "docx"]),
  skill: s(80).min(1),
  language: s(80),
  items: z
    .array(z.object({ difficulty: z.enum(DIFFICULTIES), question: s(2000), options: z.array(s(600)).length(4), correct_answer: s(600), explanation: s(1500) }))
    .min(1)
    .max(25)
    .refine((xs) => xs.every((x) => x.options.includes(x.correct_answer)), "correct_answer must be one of the options"),
  answers: z.array(s(600).nullable()).max(25).optional(),
});

/** The test the user just took (sent back by the client, since nothing is stored) as Word or PDF, with answers. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`skill-assessment-export:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many downloads - try again shortly.", 429);
  const { data, error: bad } = await readBody(req, Body);
  if (bad) return bad;
  const doc = { skill: data.skill, language: data.language, items: data.items, answers: data.answers };
  if (data.format === "pdf" && assessmentPdfUnsupported(doc)) return jsonError("PDF export supports Latin-script languages only for now. Download the Word file instead.", 422);
  const body = data.format === "pdf" ? await assessmentPdf(doc) : await assessmentDocx(doc);
  const name = `Skill_Assessment_${data.skill.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "Test"}.${data.format}`;
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": data.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
