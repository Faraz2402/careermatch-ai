import "server-only";
// Shared pieces for the Studio API routes.

import { aiEnabled } from "../ai";
import { consumeAiAction } from "../plans";
import { templateById } from "../templates/catalog";
import type { StoredState } from "./drafts";

type PlanUser = { id: string; plan: string; planRenewsAt?: Date | null };

/**
 * Use AI for this step if it's configured and the user has AI actions left.
 * Out of actions -> the rule-based engine runs instead, with a clear note.
 */
export async function aiAllowance(user: PlanUser, kind: string): Promise<{ useAi: boolean; note?: string }> {
  if (!aiEnabled()) return { useAi: false };
  const q = await consumeAiAction(user, kind);
  return q.ok ? { useAi: true } : { useAi: false, note: `${q.message} The rule-based engine was used instead.` };
}

export const isVisual = (templateId: string) => templateById(templateId).mode === "visual";

/** Default template for a job's country. */
export function defaultTemplateFor(country: string | null | undefined) {
  const byCountry: Record<string, string> = { IN: "in-corporate-ats", US: "us-corporate", GB: "uk-cv", CA: "ca-ats", AU: "au-professional", NZ: "nz-cv", SG: "sg-professional", AE: "ae-gulf", SA: "sa-gulf", DE: "de-lebenslauf", AT: "at-lebenslauf", CH: "ch-cv", FR: "fr-cv", NL: "nl-cv", BE: "be-cv", ES: "es-cv", IT: "it-cv", PT: "pt-cv", IE: "ie-cv", PL: "pl-cv", TR: "tr-cv", JP: "jp-rirekisho", KR: "kr-iryeokseo", CN: "cn-resume", HK: "hk-cv", MY: "my-professional", ZA: "za-cv", NG: "wa-cv", KE: "wa-cv", GH: "wa-cv", BR: "br-curriculo", MX: "mx-cv", AR: "latam-cv", CL: "latam-cv", CO: "latam-cv", IL: "il-resume", SE: "nordic-ats", NO: "nordic-ats", DK: "nordic-ats", FI: "nordic-ats", QA: "gcc-regional", KW: "gcc-regional", BH: "gcc-regional", OM: "gcc-regional" };
  return byCountry[(country ?? "").toUpperCase()] ?? "intl-ats";
}

/** What the browser needs (drops nothing secret: it's the owner's own data). */
export const publicState = (s: StoredState) => s;
