import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getDraft, saveDraft } from "@/lib/tailor/drafts";
import { proposeChanges, recompute } from "@/lib/tailor/engine";
import { aiAllowance, isVisual } from "@/lib/tailor/http";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Propose résumé changes (per bullet, with reasons) using the confirmed keywords. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`studio:ai:${user.id}`, 30, 60 * 60_000)).ok) return jsonError("Too many requests this hour. Try again later.", 429);
  const id = (await params).id;
  const d = await getDraft(user.id, id);
  if (!d) return jsonError("Not found.", 404);
  const ai = await aiAllowance(user, "studio:tailor");
  const next = await proposeChanges(d.state, ai.useAi);
  const state = { ...recompute(next, { visual: isVisual(d.templateId) }), personal: d.state.personal, warnings: [...next.warnings, ...(ai.note ? [ai.note] : [])] };
  return NextResponse.json(await saveDraft(user.id, id, { state }));
}
