import { z } from "zod";
import { aiEnabled, AIError, ndjsonResponse } from "@/lib/ai";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { bankAgent, webAgent } from "@/lib/interview-qa/ai";
import { relatedQuestions } from "@/lib/interview-qa/store";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  query: z.string().trim().min(2).max(1000),
  mode: z.enum(["ai", "web"]),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(12).default([]),
});

/**
 * One endpoint for the header search (AI mode) and the Interview Q&A chatbot.
 * "ai": answers from the interview bank (retrieved matches as grounding), streamed.
 * "web": a Google-grounded answer with its sources.
 */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`agent:${user.id}`, 40, 60 * 60_000)).ok) return jsonError("Slow down a little - try again shortly.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  if (!aiEnabled()) return jsonError("AI search isn't available right now.", 503);
  const quota = await consumeAiAction(user, data.mode === "web" ? "agent_web" : "agent_ai");
  if (!quota.ok) return jsonError(quota.message, 402);

  return ndjsonResponse(async (send) => {
    if (data.mode === "web") {
      try {
        const res = await webAgent(data.query);
        if (res) {
          send({ type: "text", text: res.text });
          send({ type: "sources", sources: res.sources.slice(0, 8).map((s) => ({ title: s.title, url: s.uri })) });
          send({ type: "done", engine: "web" });
          return;
        }
        send({ type: "notice", text: "Live web search isn't configured here, so this answer comes from the interview bank." });
      } catch (e) {
        send({ type: "notice", text: `${e instanceof AIError ? e.message : "Web search failed."} Answering from the interview bank instead.` });
      }
    }
    const related = await relatedQuestions(data.query);
    for await (const delta of bankAgent(data.query, related, data.history)) send({ type: "text", text: delta });
    send({ type: "related", questions: related.map((q) => ({ id: q.id, question: q.question.split("\n")[0].slice(0, 160), type: q.questionType, company: q.company })) });
    send({ type: "done", engine: "ai" });
  });
}
