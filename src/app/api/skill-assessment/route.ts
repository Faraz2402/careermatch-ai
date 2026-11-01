import { NextResponse } from "next/server";
import { aiEnabled, AIError, AIQuotaError, generateStructured } from "@/lib/ai";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { ASSESSMENT_SYSTEM, AssessmentRequest, assessmentPrompt, finalizeAssessment, GeneratedAssessment } from "@/lib/interview-qa/assessment";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Generate a multiple-choice skill assessment. Nothing is stored: the client keeps the test. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bad } = await readBody(req, AssessmentRequest);
  if (bad) return bad;
  if (!aiEnabled()) return jsonError("Skill assessments need the AI service, which isn't available right now. Please try again later.", 503);
  if (!(await rateLimit(`skill-assessment:${user.id}`, 15, 60 * 60_000)).ok) return jsonError("Slow down a little - try again shortly.", 429);
  const quota = await consumeAiAction(user, "skill_assessment");
  if (!quota.ok) return jsonError(quota.message, 402);
  try {
    const out = await generateStructured({ system: ASSESSMENT_SYSTEM, prompt: assessmentPrompt(data), schema: GeneratedAssessment, effort: "medium", maxTokens: 1200 + data.count * 420 });
    const items = finalizeAssessment(out.questions, data.count);
    if (items.length < Math.min(3, data.count)) return jsonError("The AI didn't return enough valid questions. Please try again.", 502);
    return NextResponse.json({ items, remaining: quota.remaining });
  } catch (e) {
    if (e instanceof AIQuotaError) return jsonError(e.message, 503);
    return jsonError(e instanceof AIError ? e.message : "Couldn't build the assessment right now.", 502);
  }
}
