import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getDraft, saveDraft } from "@/lib/tailor/drafts";
import { writeLetter } from "@/lib/tailor/engine";
import { aiAllowance } from "@/lib/tailor/http";
import { LENGTHS, TONES } from "@/lib/tailor/letter";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({ tone: z.enum(TONES).default("confident"), length: z.enum(LENGTHS).default("concise") });

/** Write (or rewrite) the cover letter for the same job, in the chosen tone and length. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`studio:ai:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many requests this hour. Try again later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const id = (await params).id;
  const d = await getDraft(user.id, id);
  if (!d) return jsonError("Not found.", 404);
  const ai = await aiAllowance(user, "studio:letter");
  const next = await writeLetter(d.state, data.tone, data.length, ai.useAi);
  return NextResponse.json(await saveDraft(user.id, id, { state: { ...next, personal: d.state.personal, warnings: [...next.warnings, ...(ai.note ? [ai.note] : [])] } }));
}
