import { NextResponse } from "next/server";
import { aiEnabled, AIError } from "@/lib/ai";
import { apiUser, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { draftAnswer } from "@/lib/interview-qa/ai";
import { invalidateInterviewCache, toQ } from "@/lib/interview-qa/store";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Draft a model answer for a question that has none. Saved and shared, labelled as AI-drafted. */
export async function POST(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await db.interviewQuestion.findFirst({ where: { id: decodeURIComponent((await params).id), status: "published" } });
  if (!row) return jsonError("Question not found.", 404);
  if (row.answer) return NextResponse.json({ answer: row.answer, answerOrigin: row.answerOrigin });
  if (!aiEnabled()) return jsonError("AI answers aren't available right now.", 503);
  if (!(await rateLimit(`iq-answer:${user.id}`, 20, 60 * 60_000)).ok) return jsonError("Slow down a little - try again shortly.", 429);
  const quota = await consumeAiAction(user, "interview_answer");
  if (!quota.ok) return jsonError(quota.message, 402);
  try {
    const answer = await draftAnswer(toQ(row));
    if (!answer) return jsonError("The AI returned an empty answer. Try again.", 502);
    await db.interviewQuestion.update({ where: { id: row.id }, data: { answer, answerOrigin: "ai" } });
    invalidateInterviewCache();
    return NextResponse.json({ answer, answerOrigin: "ai" });
  } catch (e) {
    return jsonError(e instanceof AIError ? e.message : "Couldn't draft an answer right now.", 502);
  }
}
