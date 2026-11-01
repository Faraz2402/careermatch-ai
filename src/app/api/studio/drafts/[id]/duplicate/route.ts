import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { canCreateDraft, createDraft, getDraft } from "@/lib/tailor/drafts";

export const runtime = "nodejs";

/** Copy a tailored application, e.g. to try another template or country. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const d = await getDraft(user.id, (await params).id);
  if (!d) return jsonError("Not found.", 404);
  const allowed = await canCreateDraft(user);
  if (!allowed.ok) return jsonError(allowed.message, 402, { upgrade: true });
  return NextResponse.json(await createDraft(user.id, { name: `${d.name} (copy)`, jobId: d.jobId, templateId: d.templateId, state: d.state }), { status: 201 });
}
