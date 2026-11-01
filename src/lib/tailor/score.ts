// Estimated ATS Alignment: a transparent, versioned estimate of how well a
// résumé covers one job description. It is not any employer's ATS score and
// does not predict interviews; real systems differ.
//
// Method ats-align-v1 (weights sum to 100):
//   required keywords 40 · preferred keywords 15 · responsibilities 20
//   evidence / achievements 15 · parsing / readability 10
// A requirement counts fully only when backed by an experience or project
// statement; a skills-list-only mention earns 60%, partial evidence 50%.
// Synonyms of one requirement count once.

import type { ResumeData } from "../resume/schema";
import { matchAll, resumePieces } from "./evidence";
import type { AlignmentScore, JobAnalysis, KeywordMatch, ScoreCategory } from "./types";

export const SCORE_METHOD = "ats-align-v1";
export const WEIGHTS = { required: 40, preferred: 15, responsibilities: 20, evidence: 15, parsing: 10 } as const;
export const SCORE_DISCLAIMER =
  "Estimated ATS Alignment compares your résumé with this job description using a published method. It is not an employer's ATS score, and a higher number doesn't guarantee an interview — real systems differ.";

const credit = (m: KeywordMatch) =>
  m.status === "exact" || m.status === "equivalent" ? (m.inContext ? 1 : 0.6) : m.status === "partial" ? 0.5 : 0;

const STOP = new Set(["and", "the", "with", "for", "our", "your", "you", "will", "from", "into", "across", "that", "this", "their", "work", "team", "teams"]);
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9+#]+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.slice(0, 6)));

export type ParsingCheck = { label: string; ok: boolean; warning: string };

/** Readability checks that ATS parsers rely on. `visual` = a designed template rather than ATS-first. */
export function parsingChecks(r: ResumeData, opts: { visual?: boolean } = {}): ParsingCheck[] {
  const bullets = r.experience.flatMap((e) => e.highlights.map((h) => h.trim().toLowerCase())).filter(Boolean);
  return [
    { label: "Name, email and phone", ok: !!(r.name && r.email && r.phone), warning: "Add your name, email and phone as plain text at the top." },
    { label: "Experience with dates", ok: r.experience.length > 0 && r.experience.every((e) => !!e.startDate), warning: "Give every role a start date (and end date or Present)." },
    { label: "Standard sections", ok: !!r.summary && r.skills.length > 0 && r.education.length > 0, warning: "Use standard sections: Summary, Skills, Experience, Education." },
    { label: "Concise bullets", ok: bullets.every((b) => b.length <= 350), warning: "Some bullets are very long; keep each to one or two lines." },
    { label: "No duplicate bullets", ok: new Set(bullets).size === bullets.length, warning: "The same bullet appears more than once." },
    { label: "ATS-friendly layout", ok: !opts.visual, warning: "This visual template uses columns or graphics that some ATS parsers misread. Download the ATS-first version for job portals." },
  ];
}

export function scoreResume(resume: ResumeData, analysis: JobAnalysis, opts: { visual?: boolean; matches?: KeywordMatch[] } = {}): AlignmentScore {
  const matches = opts.matches ?? matchAll(analysis.requirements, resume);
  const judged = matches.filter((m) => m.status !== "unclear");
  const essential = judged.filter((m) => m.requirement.essential);
  const req = essential.length ? essential : judged;
  const pref = judged.filter((m) => !m.requirement.essential);
  const avg = (xs: KeywordMatch[]) => (xs.length ? xs.reduce((s, m) => s + credit(m), 0) / xs.length : 1);

  const pieces = resumePieces(resume).filter((p) => p.context || p.section === "summary");
  const pieceWords = pieces.map((p) => words(p.text));
  const resp = analysis.responsibilities;
  const respCovered = resp.filter((line) => {
    const w = words(line);
    return w.size > 0 && pieceWords.some((pw) => [...w].filter((x) => pw.has(x)).length >= Math.max(2, Math.ceil(w.size * 0.3)));
  });

  const covered = judged.filter((m) => credit(m) > 0);
  const bullets = resume.experience.flatMap((e) => e.highlights).filter(Boolean);
  const quantified = bullets.filter((b) => /\d/.test(b)).length;
  const evidence = (covered.length ? covered.filter((m) => m.inContext).length / covered.length : 0) * 0.6 + (bullets.length ? quantified / bullets.length : 0) * 0.4;

  const checks = parsingChecks(resume, { visual: opts.visual });
  const parsing = checks.filter((c) => c.ok).length / checks.length;

  const cat = (key: ScoreCategory["key"], label: string, score: number, detail: string): ScoreCategory => ({ key, label, weight: WEIGHTS[key], score: Math.round(score * 100), points: Math.round(score * WEIGHTS[key] * 10) / 10, detail });
  const categories = [
    cat("required", "Required skills & keywords", avg(req), `${req.filter((m) => credit(m) === 1).length} of ${req.length} fully evidenced, ${req.filter((m) => credit(m) > 0 && credit(m) < 1).length} partly`),
    cat("preferred", "Preferred skills & keywords", avg(pref), `${pref.filter((m) => credit(m) > 0).length} of ${pref.length} covered`),
    cat("responsibilities", "Responsibilities & relevance", resp.length ? respCovered.length / resp.length : avg(req), resp.length ? `${respCovered.length} of ${resp.length} duties reflected in your experience` : "No separate duties listed; based on requirements"),
    cat("evidence", "Evidence & achievements", evidence, `${covered.filter((m) => m.inContext).length} of ${covered.length} matches backed by experience; ${quantified} of ${bullets.length} bullets show a result`),
    cat("parsing", "Parsing & readability", parsing, `${checks.filter((c) => c.ok).length} of ${checks.length} checks passed`),
  ];
  return {
    total: Math.round(categories.reduce((s, c) => s + c.points, 0)),
    categories,
    matched: covered.map((m) => m.requirement.keyword),
    gaps: judged.filter((m) => credit(m) === 0).map((m) => m.requirement.keyword),
    warnings: checks.filter((c) => !c.ok).map((c) => c.warning),
    method: SCORE_METHOD,
  };
}

/** Plain-language explanation of what moved between two scores. */
export function explainChange(before: AlignmentScore, after: AlignmentScore): string[] {
  const out: string[] = [];
  for (const a of after.categories) {
    const b = before.categories.find((c) => c.key === a.key);
    if (!b) continue;
    const d = Math.round((a.points - b.points) * 10) / 10;
    if (d > 0) out.push(`${a.label}: +${d} points (${a.detail}).`);
    if (d < 0) out.push(`${a.label}: ${d} points (${a.detail}). ${a.key === "parsing" ? "Check the formatting warnings." : "An accepted change removed evidence; review rejected or edited lines."}`);
  }
  const gained = after.matched.filter((k) => !before.matched.includes(k));
  if (gained.length) out.push(`Newly covered: ${gained.join(", ")}.`);
  const lost = before.matched.filter((k) => !after.matched.includes(k));
  if (lost.length) out.push(`No longer covered: ${lost.join(", ")} — restore the original wording if that was unintended.`);
  return out;
}
