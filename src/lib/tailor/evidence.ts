// Requirement <-> résumé evidence. Every match quotes the résumé text that
// supports it, so the user can see why a keyword counts as covered.

import { yearsOfExperience } from "../jobs/rank";
import type { ResumeData } from "../resume/schema";
import { canonicalSkill, skillTerms } from "../skills";
import { termPattern, termVariants } from "./terms";
import type { Evidence, KeywordMatch, Requirement, Section } from "./types";

type Piece = Evidence & { context: boolean };

/** Every résumé statement, tagged with where it sits. Experience and project lines are "in context". */
export function resumePieces(r: ResumeData): Piece[] {
  const out: Piece[] = [];
  if (r.headline) out.push({ section: "summary", text: r.headline, where: "Headline", context: false });
  if (r.summary) out.push({ section: "summary", text: r.summary, where: "Summary", context: false });
  r.experience.forEach((e) => {
    const where = [e.title, e.company].filter(Boolean).join(" at ");
    if (e.title) out.push({ section: "experience", text: e.title, where, context: true });
    for (const h of e.highlights) if (h.trim()) out.push({ section: "experience", text: h, where, context: true });
  });
  for (const p of r.projects) out.push({ section: "projects", text: [p.name, p.description, p.technologies.join(", ")].filter(Boolean).join(" — "), where: `Project: ${p.name}`, context: true });
  for (const g of r.skills) for (const s of g.skills) out.push({ section: "skills", text: s, where: `Skills · ${g.category}`, context: false });
  for (const c of r.certifications) out.push({ section: "certifications", text: [c.name, c.issuer].filter(Boolean).join(", "), where: "Certifications", context: false });
  for (const e of r.education) out.push({ section: "education", text: [e.degree, e.field, e.school].filter(Boolean).join(", "), where: "Education", context: false });
  return out;
}

const STOP = new Set(["and", "the", "with", "for", "of", "in", "to", "a", "an", "on", "or", "using", "experience", "knowledge", "skills", "strong", "good", "excellent", "ability", "proven", "working"]);
const stem = (w: string) => w.toLowerCase().replace(/[^a-z0-9+#]/g, "").slice(0, 6);
const tokens = (s: string) => s.split(/[\s/,()-]+/).map(stem).filter((w) => w.length > 2 && !STOP.has(w));

/** Every accepted spelling of a requirement: the keyword, full form, acronym, aliases. */
export function variantsOf(keyword: string): string[] {
  const canon = canonicalSkill(keyword.replace(/\s*\(.*\)$/, ""));
  return [...new Set([...termVariants(keyword), canon, ...skillTerms(keyword)].map((v) => v.trim()).filter((v) => v.length > 1))];
}

const YEARS_RE = /(\d+)\+?\s*(?:-\s*\d+\s*)?years?/i;
const DEGREE_RE = /\b(degree|bachelor'?s?|master'?s?|mba|b\.?tech|b\.?e\.?|m\.?tech|b\.?com|m\.?com|ca|cpa|phd|graduate)\b/i;

/** Classify one requirement against the résumé, with quoted evidence. */
export function matchRequirement(req: Requirement, resume: ResumeData, pieces = resumePieces(resume)): KeywordMatch {
  const bare = req.keyword.replace(/\s*\(.*\)$/, "").trim();
  const base = { requirement: req, evidence: [] as Evidence[], inContext: false };
  const fits = fitsFor(req);
  const why = req.essential ? "Listed as a requirement in the posting." : req.mentions > 1 ? `Mentioned ${req.mentions} times in the posting.` : "Mentioned in the posting as preferred or useful.";

  // Years of experience and degrees are judged directly, not by keyword.
  // "5+ years of frontend experience" — however the keyword was labelled.
  const years = (req.keyword + " " + req.phrase).match(YEARS_RE);
  if (years && /year|experience/i.test(req.keyword) && YEARS_RE.test(req.phrase + req.keyword)) {
    const have = yearsOfExperience(resume);
    const need = Number(years[1]);
    const ok = have >= need;
    return { ...base, status: have === 0 ? "unclear" : ok ? "exact" : "partial", inContext: ok, confidence: have === 0 ? "low" : "medium", evidence: have ? [{ section: "experience", text: `About ${have} years of dated experience on your résumé`, where: "Experience dates" }] : [], suggestion: { wording: req.keyword, fits: ["summary"], why: `${why} State your total relevant years in the summary only if your dates support it.` }, action: ok ? "keep" : "leave-out" };
  }
  if (DEGREE_RE.test(req.keyword) && resume.education.length) {
    const hit = pieces.find((p) => p.section === "education" && DEGREE_RE.test(p.text));
    return { ...base, status: hit ? "partial" : "unclear", confidence: "low", evidence: hit ? [hit] : [], suggestion: { wording: req.keyword, fits: ["education"], why: `${why} Check your degree matches what's asked; don't change its name.` }, action: "keep" };
  }

  const find = (pred: (p: Piece) => boolean) => pieces.filter(pred);
  const all = variantsOf(req.keyword);
  // The posting's own wording ("RFQ", "Procure-to-Pay (P2P)"): using it on the résumé is an exact match.
  const postingForms = all.filter((v) => termPattern(v).test(req.phrase)).sort((a, b) => b.length - a.length);
  const exactForms = [...new Set([bare, ...postingForms])];
  const exact = find((p) => exactForms.some((v) => termPattern(v).test(p.text)));
  const variants = all.filter((v) => !exactForms.some((f) => f.toLowerCase() === v.toLowerCase()));
  const equivalent = exact.length ? [] : find((p) => variants.some((v) => termPattern(v).test(p.text)));
  const wording = postingForms[0] ?? req.keyword;
  const hits = exact.length ? exact : equivalent;
  if (hits.length) {
    const inContext = hits.some((p) => p.context);
    return {
      requirement: req,
      status: exact.length ? "exact" : "equivalent",
      evidence: hits.slice(0, 3).map(({ section, text, where }) => ({ section, text, where })),
      inContext,
      confidence: inContext ? "high" : "medium",
      suggestion: { wording, fits, why: inContext ? why : `${why} It's only in your skills list; show where you used it in an experience bullet.` },
      action: inContext ? "keep" : "strengthen",
    };
  }

  // Partial: most of the requirement's words appear together in one statement.
  const want = tokens(bare);
  if (want.length >= 2) {
    const partial = pieces
      .map((p) => ({ p, n: want.filter((w) => tokens(p.text).includes(w)).length }))
      // At least two of the requirement's words, and half of them, so one generic word ("management") isn't enough.
      .filter((x) => x.n >= 2 && x.n / want.length >= 0.5)
      .sort((a, b) => b.n - a.n);
    if (partial.length)
      return {
        requirement: req,
        status: "partial",
        evidence: partial.slice(0, 2).map(({ p }) => ({ section: p.section, text: p.text, where: p.where })),
        inContext: partial.some(({ p }) => p.context),
        confidence: "low",
        suggestion: { wording: req.keyword, fits, why: `${why} Related wording is on your résumé; use the posting's exact term where it's accurate.` },
        action: "strengthen",
      };
  }

  return {
    ...base,
    status: "missing",
    confidence: "low",
    suggestion: { wording: req.keyword, fits, why: `${why} Not evidenced in your résumé — add it only if you really have this experience.` },
    action: req.essential ? "add-if-true" : "learning",
  };
}

function fitsFor(req: Requirement): Section[] {
  if (req.group === "tools") return ["skills", "experience"];
  if (req.group === "behavioural") return ["experience", "summary"];
  if (/certif|certified|licen[cs]e/i.test(req.keyword)) return ["certifications"];
  if (DEGREE_RE.test(req.keyword)) return ["education"];
  return ["experience", "summary", "skills"];
}

export function matchAll(requirements: Requirement[], resume: ResumeData): KeywordMatch[] {
  const pieces = resumePieces(resume);
  return requirements.map((r) => matchRequirement(r, resume, pieces));
}
