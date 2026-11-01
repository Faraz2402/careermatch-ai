// Truthfulness guard for proposed résumé and letter text. A proposal is
// rejected when it introduces a number/date, or a skill/tool, that isn't in
// the source text, the user's résumé, or the keywords the user confirmed.

import { extractSkills } from "../skills";
import { findTerms, termPattern, termVariants } from "./terms";

/** Numbers, percentages, money and years as written ("18%", "₹2.5 Cr", "1,200", "2021"). */
export const numbersIn = (text: string) =>
  // Standalone numbers only: the digits in "P2P", "B2B" or "S/4HANA" are part of a term.
  [...text.matchAll(/(?<![A-Za-z])\d[\d,.]*(?![A-Za-z])/g)].map((m) => m[0].replace(/[,.]$/, "").replace(/,/g, ""));

/** Named skills, tools and process terms mentioned in a text. */
export const claimsIn = (text: string) => [...new Set([...extractSkills(text).map((s) => s.name), ...findTerms(text).map((t) => t.name)])];

export type GuardContext = {
  /** All of the user's own résumé text. */
  resumeText: string;
  /** Keywords the user confirmed are true (selected or learning). */
  allowed: string[];
};

const mentionedIn = (claim: string, text: string) => termVariants(claim).some((v) => termPattern(v).test(text));

/** Problems with a proposed rewrite of `source` (empty when it's safe). */
export function checkProposal(source: string, proposed: string, ctx: GuardContext): string[] {
  const problems: string[] = [];
  const have = new Set(numbersIn(source));
  // Text quoted from the job posting ("…you describe — "run spend analysis"…") isn't a claim.
  const claimed = proposed.replace(/["“][^"”]{3,300}["”]/g, " ");
  const extra = numbersIn(claimed).filter((n) => !have.has(n));
  if (extra.length) problems.push(`adds figures that aren't in your original (${[...new Set(extra)].join(", ")})`);
  const allowedText = `${ctx.resumeText}\n${ctx.allowed.join("\n")}`;
  // Same detection on the user's own text (e.g. "mentored" already evidences Leadership).
  const supported = new Set([...claimsIn(source), ...claimsIn(allowedText)]);
  const unsupported = claimsIn(claimed).filter((c) => !supported.has(c) && !mentionedIn(c, source) && !mentionedIn(c, allowedText));
  if (unsupported.length) problems.push(`mentions ${unsupported.join(", ")}, which isn't on your résumé or in the keywords you confirmed`);
  if (proposed.trim().length < 12) problems.push("is too short to replace the original");
  return problems;
}
