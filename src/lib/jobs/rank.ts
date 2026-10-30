// Deterministic, explainable job-fit scoring. Every point in the score can be
// traced to a reason shown to the user.
//
//   Skills 40 · Role/title 20 · Relevance 10 · Seniority 10 · Location 10 ·
//   Salary 5 · Recency 5  (= 100)  plus up to ±5 from the user's own feedback.

import { allSkills, type JobPreferences, type ResumeData } from "../resume/schema";
import { canonicalSkill, extractSkills, textMentionsSkill } from "../skills";
import type { NormalizedJob } from "./types";

export type Seniority = "intern" | "junior" | "mid" | "senior" | "lead" | "executive";

export function detectSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "intern";
  if (/\b(vp|vice president|director|head of|chief|cto|ceo)\b/.test(t)) return "executive";
  if (/\b(staff|principal|lead|manager|architect)\b/.test(t)) return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|entry|graduate|associate)\b/.test(t)) return "junior";
  return "mid";
}

const LEVELS: Seniority[] = ["intern", "junior", "mid", "senior", "lead", "executive"];

export function yearsOfExperience(r: ResumeData): number {
  const years = r.experience.flatMap((e) => [e.startDate, e.endDate]).map((d) =>
    /present/i.test(d) ? new Date().getFullYear() : Number(d.match(/(19|20)\d{2}/)?.[0]),
  ).filter((n) => n > 1950);
  return years.length >= 2 ? Math.max(...years) - Math.min(...years) : 0;
}

export function inferSeniority(r: ResumeData): Seniority {
  const fromTitle = r.experience[0] ? detectSeniority(r.experience[0].title) : null;
  const y = yearsOfExperience(r);
  const fromYears: Seniority = y >= 5 ? "senior" : y >= 2 ? "mid" : y >= 1 ? "junior" : "intern";
  // An explicit level in the current title wins; years only refine plain titles.
  return fromTitle && fromTitle !== "mid" ? fromTitle : fromYears;
}

// --- Role families: titles that mean the same job ---------------------------

export const ROLE_FAMILIES: Record<string, RegExp> = {
  frontend: /front[- ]?end|\bui (engineer|developer)|web (developer|engineer)|react (developer|engineer)|javascript (developer|engineer)/i,
  backend: /back[- ]?end|server[- ]side|\bapi (engineer|developer)|platform api/i,
  fullstack: /full[- ]?stack/i,
  mobile: /\b(ios|android|mobile|react native|flutter)\b/i,
  data: /data (scientist|analyst|engineer)|analytics|business intelligence|\bbi (developer|analyst)/i,
  ml: /machine learning|\bml\b|\bai (engineer|researcher)|deep learning|\bllm\b/i,
  devops: /devops|\bsre\b|site reliability|platform engineer|infrastructure|cloud engineer/i,
  security: /security|appsec|penetration/i,
  design: /designer|\bux\b|\bui\/ux|user experience/i,
  product: /product (manager|owner|lead)|\bpm\b/i,
  qa: /\bqa\b|quality assurance|test (engineer|automation)|sdet/i,
  management: /engineering manager|head of engineering|director of engineering|\bvp\b.*engineering/i,
};

export const familiesOf = (title: string) => Object.entries(ROLE_FAMILIES).filter(([, re]) => re.test(title)).map(([f]) => f);
// Families that commonly overlap (a full-stack dev is a fair match for FE/BE).
const ADJACENT: Record<string, string[]> = { fullstack: ["frontend", "backend"], frontend: ["fullstack"], backend: ["fullstack", "devops"], ml: ["data"], data: ["ml"], devops: ["backend"] };

// --- Lightweight text similarity ---------------------------------------------

const STOPWORDS = new Set("a an and are as at be by for from has have in is it of on or our that the this to we will with you your their they who what which job role team work experience years year using use help new people including across strong ability skills".split(" "));
const STOP = new Set(["and", "the", "of", "for", "a", "an", "to", "in", "with", "i", "ii", "iii", "iv", "sr", "jr", "senior", "junior", "lead", "staff", "principal", "remote", "contract", "-", "&", "(", ")", "m/w/d", "m", "w", "d", "f"]);

const stem = (w: string) => w.replace(/(ing|ers|er|ed|es|s)$/, "");
function terms(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z][a-z0-9+#.]{1,30}/g) ?? []) {
    if (STOPWORDS.has(raw)) continue;
    const w = stem(raw.replace(/\.$/, ""));
    if (w.length > 1) m.set(w, (m.get(w) ?? 0) + 1);
  }
  return m;
}
function cosineTerms(a: Map<string, number>, b: Map<string, number>) {
  let dot = 0, na = 0, nb = 0;
  for (const [, v] of a) na += Math.log1p(v) ** 2;
  for (const [k, v] of b) {
    const wb = Math.log1p(v);
    nb += wb * wb;
    const va = a.get(k);
    if (va) dot += Math.log1p(va) * wb;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

const words = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9+#.\s/-]/g, " ").split(/[\s/,-]+/).filter((w) => w.length > 1 && !STOP.has(w));

function titleSimilarity(jobTitle: string, targets: string[]): { sim: number; viaFamily: string | null } {
  const jw = new Set(words(jobTitle));
  let best = 0;
  for (const t of targets) {
    const tw = words(t);
    if (tw.length === 0 || jw.size === 0) continue;
    const hits = tw.filter((w) => jw.has(w) || [...jw].some((j) => j.startsWith(w) || w.startsWith(j))).length;
    best = Math.max(best, hits / Math.max(tw.length, Math.min(jw.size, 4)));
  }
  const jobFam = familiesOf(jobTitle);
  const targetFam = new Set(targets.flatMap(familiesOf));
  const same = jobFam.find((f) => targetFam.has(f));
  const adjacent = jobFam.find((f) => (ADJACENT[f] ?? []).some((a) => targetFam.has(a)));
  if (same && best < 0.8) return { sim: 0.8, viaFamily: same };
  if (adjacent && best < 0.55) return { sim: 0.55, viaFamily: adjacent };
  return { sim: Math.min(1, best), viaFamily: null };
}

// --- Context ------------------------------------------------------------------

export type FeedbackJob = { title: string; company: string };
export type Feedback = { liked: FeedbackJob[]; disliked: FeedbackJob[] };

export type MatchContext = {
  resume: ResumeData;
  prefs: JobPreferences;
  profileTerms: Map<string, number>;
  profileEmbedding: number[] | null;
  feedback: Feedback;
  userSkills: string[];
};

export function buildMatchContext(resume: ResumeData, prefs: JobPreferences, opts: { feedback?: Feedback; profileEmbedding?: number[] | null } = {}): MatchContext {
  const profileText = [resume.headline, ...prefs.roles, resume.summary, ...resume.experience.flatMap((e) => [e.title, ...e.highlights]), ...allSkills(resume), ...resume.projects.map((p) => p.description)].join(" ");
  return {
    resume,
    prefs,
    profileTerms: terms(profileText),
    profileEmbedding: opts.profileEmbedding ?? null,
    feedback: opts.feedback ?? { liked: [], disliked: [] },
    userSkills: [...new Set(allSkills(resume).map(canonicalSkill))],
  };
}

export type MatchResult = {
  score: number; // 0-100
  matched: string[];
  missing: string[];
  reasons: string[];
  concerns: string[];
  breakdown: { label: string; points: number; max: number }[];
  seniority: Seniority;
  stale: boolean;
  semantic: "embeddings" | "lexical";
};

export const STALE_DAYS = 30;

export function isStale(postedAt: Date | null) {
  return !postedAt || Date.now() - postedAt.getTime() > STALE_DAYS * 86_400_000;
}

function titleJaccard(a: string, b: string) {
  const A = new Set(words(a)), B = new Set(words(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

type ScorableJob = NormalizedJob & { embedding?: string | null; salaryYearlyUsd?: number | null };

// Per-listing analysis is user-independent, so it's cached across searches.
type Analysis = { found: Set<string>; terms: Map<string, number>; text: string };
const analysisCache = new Map<string, Analysis>();

function analyze(job: ScorableJob): Analysis {
  const key = `${job.source}:${job.externalId}:${job.title.length}:${job.description.length}`;
  const hit = analysisCache.get(key);
  if (hit) return hit;
  const text = `${job.title}\n${job.description}`;
  const a = { text, found: new Set(extractSkills(text).map((s) => s.name)), terms: terms(`${job.title} ${job.title} ${job.title} ${job.description.slice(0, 6000)}`) };
  if (analysisCache.size > 20_000) analysisCache.delete(analysisCache.keys().next().value!);
  analysisCache.set(key, a);
  return a;
}

export function scoreJob(job: ScorableJob, resumeOrCtx: ResumeData | MatchContext, prefsArg?: JobPreferences): MatchResult {
  const ctx = "profileTerms" in resumeOrCtx ? resumeOrCtx : buildMatchContext(resumeOrCtx, prefsArg!);
  const { resume, prefs } = ctx;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const { text, found, terms: jobTerms } = analyze(job);

  // 1. Skills (40)
  const jobSkills = new Set(found);
  for (const s of ctx.userSkills) if (!jobSkills.has(s) && textMentionsSkill(text, s, found)) jobSkills.add(s);
  const userSet = new Set(ctx.userSkills.map((s) => s.toLowerCase()));
  const matched = [...jobSkills].filter((s) => userSet.has(s.toLowerCase()));
  const missing = [...jobSkills].filter((s) => !userSet.has(s.toLowerCase()));
  const skillRatio = jobSkills.size ? matched.length / jobSkills.size : 0.4;
  const skillPts = Math.round(40 * Math.min(1, skillRatio * 1.15));
  if (matched.length) reasons.push(`You have ${matched.length} of ${jobSkills.size} skills this posting mentions.`);
  if (missing.length) concerns.push(`Not on your profile: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}.`);

  // 2. Title / role (20) - includes role-family equivalence
  const targets = [...prefs.roles, resume.headline, ...resume.experience.slice(0, 2).map((e) => e.title)].filter(Boolean);
  const { sim, viaFamily } = titleSimilarity(job.title, targets);
  const titlePts = Math.round(20 * sim);
  if (viaFamily) reasons.push(`Same kind of role as you're targeting (${viaFamily}), even though the title differs.`);
  else if (sim >= 0.6) reasons.push(prefs.roles.length ? "Title matches a role you're targeting." : "Title is close to your recent roles.");
  else if (sim < 0.25) concerns.push("Job title is different from the roles you're targeting.");

  // 3. Relevance (10): embeddings when available, else lexical similarity
  let relevance: number;
  let semantic: MatchResult["semantic"] = "lexical";
  const jobVec = ctx.profileEmbedding && job.embedding ? safeVector(job.embedding) : null;
  if (ctx.profileEmbedding && jobVec) {
    semantic = "embeddings";
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < jobVec.length; i++) {
      dot += jobVec[i] * ctx.profileEmbedding[i];
      na += jobVec[i] ** 2;
      nb += ctx.profileEmbedding[i] ** 2;
    }
    const c = na && nb ? dot / Math.sqrt(na * nb) : 0;
    relevance = Math.max(0, Math.min(1, (c - 0.25) / 0.4));
  } else {
    relevance = Math.min(1, cosineTerms(ctx.profileTerms, jobTerms) / 0.32);
  }
  const relPts = Math.round(10 * relevance);
  if (relevance >= 0.7) reasons.push("The description closely resembles your experience.");

  // 4. Seniority (10)
  const seniority = detectSeniority(job.title);
  const wanted = prefs.seniority === "any" ? inferSeniority(resume) : prefs.seniority;
  const gap = Math.abs(LEVELS.indexOf(seniority) - LEVELS.indexOf(wanted));
  const senPts = gap === 0 ? 10 : gap === 1 ? 6 : 0;
  if (gap === 0) reasons.push(`Seniority (${seniority}) fits your level.`);
  else if (gap >= 2) concerns.push(`Seniority looks like ${seniority}; you're closer to ${wanted}.`);

  // 5. Location & work arrangement (10)
  let locPts = 0;
  const modeOk = job.workMode === "unknown" || prefs.workModes.length === 0 || prefs.workModes.includes(job.workMode as "remote");
  const locOk =
    prefs.locations.length === 0 ||
    job.workMode === "remote" ||
    prefs.locations.some((l) => job.location.toLowerCase().includes(l.toLowerCase().split(",")[0].trim()));
  if (modeOk) locPts += 5;
  if (locOk) locPts += 5;
  if (modeOk && job.workMode !== "unknown") reasons.push(`${job.workMode[0].toUpperCase()}${job.workMode.slice(1)} fits your preference.`);
  if (!modeOk) concerns.push(`Work arrangement is ${job.workMode}, which isn't in your preferences.`);
  if (!locOk) concerns.push(`Location (${job.location || "unspecified"}) is outside your preferred locations.`);

  // 6. Salary (5) - compared in yearly USD
  let salPts = 2;
  const yearly = job.salaryYearlyUsd ?? null;
  if (yearly != null) {
    if (prefs.salaryMin != null && yearly < prefs.salaryMin) {
      salPts = 0;
      concerns.push("Posted salary is below your minimum.");
    } else {
      salPts = 5;
      if (prefs.salaryMin != null) reasons.push("Posted salary meets your range.");
    }
  }

  // 7. Recency (5)
  const ageDays = job.postedAt ? (Date.now() - job.postedAt.getTime()) / 86_400_000 : null;
  const recPts = ageDays == null ? 2 : ageDays <= 7 ? 5 : ageDays <= STALE_DAYS ? 3 : 1;
  const stale = isStale(job.postedAt);
  if (stale) concerns.push(job.postedAt ? "Posted over 30 days ago - it may be filled." : "No posting date provided - it may be stale.");

  // 8. Learning from the user's own saves and hides (±5)
  const company = job.company.replace(/\s*\(sample\)$/, "").toLowerCase();
  const likedSim = Math.max(0, ...ctx.feedback.liked.map((f) => titleJaccard(f.title, job.title)));
  const dislikedSim = Math.max(0, ...ctx.feedback.disliked.map((f) => titleJaccard(f.title, job.title)));
  let fb = Math.round(5 * (likedSim - dislikedSim));
  if (ctx.feedback.disliked.some((f) => f.company.replace(/\s*\(sample\)$/, "").toLowerCase() === company)) fb = Math.min(fb, -3);
  fb = Math.max(-5, Math.min(5, fb));
  if (fb > 0) reasons.push("Similar to jobs you've saved or applied to.");
  if (fb < 0) concerns.push("Similar to jobs you've hidden.");

  const breakdown = [
    { label: "Skills", points: skillPts, max: 40 },
    { label: "Role / title", points: titlePts, max: 20 },
    { label: semantic === "embeddings" ? "Relevance (AI)" : "Relevance", points: relPts, max: 10 },
    { label: "Seniority", points: senPts, max: 10 },
    { label: "Location & arrangement", points: locPts, max: 10 },
    { label: "Salary", points: salPts, max: 5 },
    { label: "Recency", points: recPts, max: 5 },
  ];
  if (fb !== 0) breakdown.push({ label: "Your feedback", points: fb, max: 5 });
  const score = Math.max(0, Math.min(100, breakdown.reduce((a, b) => a + b.points, 0)));
  return { score, matched, missing, reasons, concerns, breakdown, seniority, stale, semantic };
}

function safeVector(s: string): number[] | null {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
