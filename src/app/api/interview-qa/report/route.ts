import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { stableId } from "@/lib/interview-qa/sources";
import { ALL_DEPARTMENTS, DEPARTMENT_NAMES, QUESTION_TYPES, tagText } from "@/lib/interview-qa/taxonomy";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({
  question: z.string().trim().min(15).max(1500),
  company: z.string().trim().max(80).optional(),
  department: z.enum([ALL_DEPARTMENTS, ...DEPARTMENT_NAMES] as [string, ...string[]]),
  role: z.string().trim().max(80).optional(),
  type: z.enum(QUESTION_TYPES),
  roundType: z.enum(["Screening", "HR", "Technical", "Behavioral", "Case", "Final"]).optional(),
  askedOn: z.string().regex(/^\d{4}-\d{2}$/),
  answer: z.string().trim().max(5000).optional(),
});

/** A user reports a question they were actually asked. Published after an admin reviews it. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`iq-report:${user.id}`, 10, 24 * 3600_000)).ok) return jsonError("You've reported a lot today - thank you! Try again tomorrow.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const asked = new Date(`${data.askedOn}-01T00:00:00Z`);
  const now = new Date();
  if (asked > now || now.getTime() - asked.getTime() > 3 * 365 * 24 * 3600_000) return jsonError("Pick the month you were asked (within the last three years).");
  const tags = tagText(data.question, data.answer);
  const id = `user:${stableId(`${user.id} ${data.question}`)}`;
  if (await db.interviewQuestion.findUnique({ where: { id } })) return jsonError("You've already reported this question.", 409);
  await db.interviewQuestion.create({
    data: {
      id,
      source: "user",
      sourceUrl: "/interview-qa",
      license: "User-contributed",
      attribution: "Reported by a CareerMatch user",
      company: data.company || null,
      department: data.department,
      roles: JSON.stringify(data.role ? [data.role] : []),
      questionType: data.type,
      roundType: data.roundType ?? null,
      question: data.question,
      answer: data.answer || null,
      answerOrigin: data.answer ? "user" : null,
      tools: JSON.stringify(tags.tools),
      skills: JSON.stringify(tags.skills),
      dateAsked: asked,
      sourceUpdatedAt: now,
      hash: stableId(data.question),
      status: "pending",
      submittedById: user.id,
    },
  });
  return NextResponse.json({ ok: true });
}
