import { z } from "zod";
import { aiEnabled, AIError, ndjsonResponse, streamText } from "@/lib/ai";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { interviewSystemPrompt, templateInterviewTurn } from "@/lib/interview";
import { jobRowToNormalized, loadUserContext } from "@/lib/jobs/service";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel Hobby limit

const Body = z.object({
  jobId: z.string().min(1),
  resumeVersionId: z.string().nullish(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(40),
});

/** One mock-interview turn, streamed as NDJSON. History is append-only. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`interview:${user.id}`, 60, 60 * 60_000)).ok) return jsonError("Slow down a little - try again shortly.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const job = await db.job.findUnique({ where: { id: data.jobId } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
  const { resume } = await loadUserContext(user.id, data.resumeVersionId);
  const normalized = jobRowToNormalized(job);

  // A session is metered once, on its opening turn.
  if (aiEnabled() && data.messages.length === 0) {
    const quota = await consumeAiAction(user, "mock_interview");
    if (!quota.ok) return jsonError(quota.message, 402);
  }

  return ndjsonResponse(async (send) => {
    if (aiEnabled()) {
      try {
        const messages = data.messages.length ? data.messages : [{ role: "user" as const, content: "I'm ready to start the interview." }];
        for await (const delta of streamText({ system: interviewSystemPrompt(resume, normalized), messages, effort: "low", maxTokens: 2000 })) send({ type: "text", text: delta });
        send({ type: "done", engine: "ai" });
        return;
      } catch (err) {
        send({ type: "reset" });
        send({ type: "notice", text: `${err instanceof AIError ? err.message : "AI unavailable."} Continuing with practice questions.` });
      }
    }
    send({ type: "text", text: templateInterviewTurn(resume, normalized, data.messages) });
    send({ type: "done", engine: "template" });
  });
}
