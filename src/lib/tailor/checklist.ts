// Pre-export validation. Users may still export after warnings, but each
// risk is spelled out first.

import type { ResumeData } from "../resume/schema";
import type { TemplateDef } from "../templates/catalog";
import { SENSITIVE_FIELDS } from "../templates/catalog";
import type { Personal } from "../templates/model";
import { claimsIn, numbersIn } from "./guard";
import { resumeText } from "./rewrite";
import { termPattern, termVariants } from "./terms";

export type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };

const yearOf = (s: string) => Number(s.match(/(19|20)\d{2}/)?.[0] ?? 0);
const PRIVACY_FIRST = ["United States", "Canada", "United Kingdom", "Ireland", "Australia", "New Zealand", "Global", "Nordics (SE, NO, DK, FI)", "Israel", "South Africa"];

/** `confirmed`: keywords the user confirmed as true. `nonLatinDropped`: text a PDF can't draw. */
export function exportChecklist(input: { tailored: ResumeData; base: ResumeData; template: TemplateDef; personal: Personal; confirmed: string[]; format: "pdf" | "docx"; nonLatinDropped?: boolean }): Check[] {
  const { tailored: r, base, template: t } = input;
  const checks: Check[] = [];
  const add = (id: string, label: string, ok: boolean | "warn", detail: string, failIfBad = false) =>
    checks.push({ id, label, status: ok === true ? "pass" : ok === "warn" || !failIfBad ? "warn" : "fail", detail: ok === true ? "Looks good." : detail });

  const missing = [!r.name && "name", !r.email && "email", !r.phone && "phone"].filter(Boolean);
  add("contact", "Contact details", missing.length === 0, `Add your ${missing.join(", ")} at the top.`, true);

  const badDates = r.experience.filter((e) => !e.startDate || (yearOf(e.endDate) && yearOf(e.endDate) < yearOf(e.startDate)));
  add("dates", "Consistent dates", badDates.length === 0, `Check dates for: ${badDates.map((e) => e.title || e.company).join(", ")}.`);

  const all = resumeText(r);
  const doubled = all.match(/\b(\w+)[ \t]+\1\b/i); // within a line: separate list items may repeat
  add("proofread", "Proofreading", !doubled && !/[^\s] {2,}[^\s]/.test(all), doubled ? `Repeated word: "${doubled[0]}". Run a spell check before sending.` : "Extra spaces found. Run a spell check before sending.");

  const bullets = r.experience.flatMap((e) => e.highlights.map((h) => h.trim().toLowerCase()));
  add("duplicates", "No duplicate bullets", new Set(bullets).size === bullets.length, "The same bullet appears twice.");

  const baseText = resumeText(base);
  const allowed = `${baseText}\n${input.confirmed.join("\n")}`;
  const supported = new Set(claimsIn(allowed));
  const unsupported = claimsIn(all).filter((c) => !supported.has(c) && !termVariants(c).some((v) => termPattern(v).test(allowed)));
  add("keywords", "Only skills you have", unsupported.length === 0, `Not in your base résumé or confirmed keywords: ${unsupported.join(", ")}.`, true);

  const baseNums = new Set(numbersIn(baseText));
  const newNums = [...new Set(numbersIn(all).filter((n) => !baseNums.has(n)))];
  add("metrics", "Only figures you supplied", newNums.length === 0, `Figures not in your original résumé: ${newNums.join(", ")}. Keep them only if they're accurate.`, true);

  add("layout", "ATS-friendly layout", t.mode === "ats" || "warn", "This Visual template uses columns, a header band or a table. Many ATS parsers misread these — use the ATS-first download for job portals.");
  add("fonts", "Standard fonts, no text in headers/footers or images", true, "");
  if (input.format === "pdf" && input.nonLatinDropped)
    add("charset", "Characters the PDF can show", "warn", "Some characters (e.g. Japanese, Korean, Chinese, Arabic) can't be drawn by the PDF's standard fonts. Download Word for full-script text.");

  const sensitive = SENSITIVE_FIELDS.filter((f) => input.personal[f]?.trim());
  if (sensitive.length)
    add("privacy", "Personal data", PRIVACY_FIRST.includes(t.market) ? false : "warn", `You've included ${sensitive.join(", ")}. Many employers don't need it and some markets discourage it — include it only if the advert asks.`);
  if (t.photo === "expected") add("photo", "Photo", "warn", "This format usually expects a photo. Add one in Word if the employer asks for it.");
  return checks;
}
