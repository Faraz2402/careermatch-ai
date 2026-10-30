import { z } from "zod";
import { aiEnabled, AI_MODEL, AIError, ndjsonResponse, streamText, TRUTHFULNESS_RULES } from "@/lib/ai";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { generate } from "@/lib/generate";
import { saveGeneration } from "@/lib/generations";
import { jobRowToNormalized, loadUserContext } from "@/lib/jobs/service";
import { consumeAiAction } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({ jobId: z.string().min(1), resumeVersionId: z.string().nullish() });

/** Streams a cover letter as NDJSON: {type:"text"} deltas, then {type:"done"}. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`gen:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many generations this hour. Try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const job = await db.job.findUnique({ where: { id: data.jobId } });
  if (!job || (job.importedById && job.importedById !== user.id)) return jsonError("Job not found.", 404);
  const { resume, prefs, hasProfile } = await loadUserContext(user.id, data.resumeVersionId);
  if (!hasProfile) return jsonError("Create your profile first.", 400);
  const normalized = jobRowToNormalized(job);

  if (aiEnabled()) {
    const quota = await consumeAiAction(user, "cover_letter");
    if (!quota.ok) return jsonError(quota.message, 402);
  }

  return ndjsonResponse(async (send) => {
    const finish = async (content: { subject: string; body: string }, engine: string, warning?: string) => {
      const row = await saveGeneration({ userId: user.id, jobId: job.id, kind: "cover_letter", content, engine, resumeVersionId: data.resumeVersionId });
      send({ type: "done", id: row.id, content, engine, warning, createdAt: row.createdAt, resumeVersionId: row.resumeVersionId });
    };

    if (aiEnabled()) {
      let text = "";
      try {
        for await (const delta of streamText({
          effort: "high",
          system: `You are an expert career coach writing a tailored cover letter.\n\n${TRUTHFULNESS_RULES}\n\nOutput format: first line "Subject: <subject>", then a blank line, then the letter as plain-text paragraphs separated by blank lines. 250-350 words, warm and confident, no clichés or placeholders. Sign with the candidate's name.`,
          messages: [{ role: "user", content: `<candidate_profile>\n${JSON.stringify(resume)}\n</candidate_profile>\n\n<job>\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\n${job.description.slice(0, 30_000)}\n</job>` }],
        })) {
          text += delta;
          send({ type: "text", text: delta });
        }
        const m = text.match(/^\s*Subject:\s*(.+)\n+/i);
        await finish({ subject: m?.[1].trim() ?? `Application for ${job.title}`, body: (m ? text.slice(m[0].length) : text).trim() }, AI_MODEL);
        return;
      } catch (err) {
        send({ type: "reset" });
        const t = await generate("cover_letter", resume, prefs, normalized);
        await finish(t.content, "template", `${err instanceof AIError ? err.message : "AI generation failed."} Showing a template-based draft instead.`);
        return;
      }
    }
    const t = await generate("cover_letter", resume, prefs, normalized);
    send({ type: "text", text: `Subject: ${t.content.subject}\n\n${t.content.body}` });
    await finish(t.content, t.engine, t.warning);
  });
}
