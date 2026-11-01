import "server-only";
// Tailored applications ("drafts") in the Studio. State is encrypted at rest;
// only the owner can read it.

import { sealJson, unsealJson } from "../crypto";
import { db } from "../db";
import { PLANS, planOf } from "../plans";
import { DEFAULT_TEMPLATE_ID, templateById } from "../templates/catalog";
import type { Design, Personal } from "../templates/model";
import type { TailorState } from "./types";

/** `photo`: optional square JPEG data URL for photo designs, sealed with the rest of the draft. */
export type StoredState = TailorState & { personal: Personal; design?: Design; photo?: string };
export type DraftView = { id: string; name: string; jobId: string | null; templateId: string; country: string; updatedAt: string; state: StoredState };
export type DraftSummary = { id: string; name: string; jobId: string | null; templateId: string; updatedAt: string; title: string; company: string; before: number | null; after: number | null };

type Row = { id: string; name: string; jobId: string | null; templateId: string; country: string; updatedAt: Date; state: string };

const view = (r: Row): DraftView => ({ id: r.id, name: r.name, jobId: r.jobId, templateId: r.templateId, country: r.country, updatedAt: r.updatedAt.toISOString(), state: unsealJson<StoredState>(r.state, null as never) });

export async function listDrafts(userId: string): Promise<DraftSummary[]> {
  const rows = await db.tailorDraft.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 100 });
  return rows.map((r) => {
    const s = view(r).state;
    return { id: r.id, name: r.name, jobId: r.jobId, templateId: r.templateId, updatedAt: r.updatedAt.toISOString(), title: s?.source.title ?? "", company: s?.source.company ?? "", before: s?.scores.before?.total ?? null, after: s?.scores.after?.total ?? null };
  });
}

export async function getDraft(userId: string, id: string) {
  const r = await db.tailorDraft.findFirst({ where: { id, userId } });
  return r ? view(r) : null;
}

/** May this user start another tailored application? */
export async function canCreateDraft(user: { id: string; plan: string; planRenewsAt?: Date | null }) {
  const limit = PLANS[planOf(user)].tailorDrafts;
  if (limit === null) return { ok: true as const };
  const n = await db.tailorDraft.count({ where: { userId: user.id } });
  return n < limit
    ? { ok: true as const }
    : { ok: false as const, message: `The Free plan includes ${limit} tailored résumé and cover letter. Upgrade to Pro to tailor for every job you apply to.` };
}

export const canUseTemplate = (user: { plan: string; planRenewsAt?: Date | null }, templateId: string) =>
  templateById(templateId).tier === "free" || PLANS[planOf(user)].premiumTemplates;

export async function createDraft(userId: string, input: { name: string; jobId: string | null; templateId?: string; state: StoredState }) {
  const r = await db.tailorDraft.create({
    data: { userId, name: input.name.slice(0, 120), jobId: input.jobId, templateId: input.templateId ?? DEFAULT_TEMPLATE_ID, country: templateById(input.templateId).market, state: sealJson(input.state) },
  });
  return view(r);
}

export async function saveDraft(userId: string, id: string, patch: { name?: string; templateId?: string; state?: StoredState }) {
  const { count } = await db.tailorDraft.updateMany({
    where: { id, userId },
    data: {
      ...(patch.name !== undefined && { name: patch.name.slice(0, 120) }),
      ...(patch.templateId !== undefined && { templateId: patch.templateId, country: templateById(patch.templateId).market }),
      ...(patch.state !== undefined && { state: sealJson(patch.state) }),
    },
  });
  return count > 0 ? getDraft(userId, id) : null;
}

export async function deleteDraft(userId: string, id: string) {
  const { count } = await db.tailorDraft.deleteMany({ where: { id, userId } });
  return count > 0;
}
