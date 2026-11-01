// Shared types for the Résumé & Cover Letter Studio's tailoring engine.

import type { ResumeData } from "../resume/schema";

/** Where a requirement sits in the gap dashboard. */
export type ReqGroup = "must" | "preferred" | "tools" | "domain" | "behavioural";
export const GROUP_LABELS: Record<ReqGroup, string> = {
  must: "Must-have",
  preferred: "Preferred",
  tools: "Tools / technology",
  domain: "Domain / process",
  behavioural: "Behavioural / leadership",
};

export type Requirement = {
  id: string;
  /** Wording as it appears in the job description. */
  phrase: string;
  /** Short keyword to match and to use in the résumé, e.g. "Procure-to-Pay (P2P)". */
  keyword: string;
  group: ReqGroup;
  /** Essential (explicitly required) vs preferred / nice to have. */
  essential: boolean;
  /** Times the keyword appears in the posting (a hint, not proof of importance). */
  mentions: number;
};

export type JobAnalysis = {
  title: string;
  company: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
  /** "ai" or "rules" (deterministic fallback). */
  method: string;
  version: string;
};

export type MatchStatus = "exact" | "equivalent" | "partial" | "missing" | "unclear";
export const STATUS_LABELS: Record<MatchStatus, string> = {
  exact: "Present (exact)",
  equivalent: "Present (equivalent wording)",
  partial: "Partially evidenced",
  missing: "Missing",
  unclear: "Not applicable / unclear",
};

/** Résumé locations a keyword can be evidenced in or added to. */
export type Section = "summary" | "skills" | "experience" | "projects" | "certifications" | "education";

export type Evidence = { section: Section; text: string; where: string };

export type KeywordMatch = {
  requirement: Requirement;
  status: MatchStatus;
  /** Résumé text that supports the keyword (quoted exactly). */
  evidence: Evidence[];
  /** Backed by an experience or project statement, not just a skills list. */
  inContext: boolean;
  confidence: "high" | "medium" | "low";
  /** Suggested wording and placement for the résumé. */
  suggestion: { wording: string; fits: Section[]; why: string };
  /** What the Studio offers by default. */
  action: "keep" | "strengthen" | "add-if-true" | "learning" | "leave-out";
};

export type ScoreCategory = { key: "required" | "preferred" | "responsibilities" | "evidence" | "parsing"; label: string; weight: number; score: number; points: number; detail: string };

export type AlignmentScore = {
  total: number;
  categories: ScoreCategory[];
  matched: string[];
  gaps: string[];
  warnings: string[];
  method: string;
};

/** One proposed edit to the résumé: always reviewable and reversible. */
export type Change = {
  id: string;
  section: Section | "headline";
  /** Experience index / bullet index for experience changes. */
  ref?: { exp?: number; bullet?: number };
  original: string;
  proposed: string;
  reason: string;
  keywords: string[];
  status: "pending" | "accepted" | "rejected";
  /** Guard notes: anything removed from the AI proposal because it wasn't supported. */
  flags: string[];
};

export type ActionItem = { priority: "required" | "recommended" | "optional"; title: string; why: string };

export type CoverLetter = { subject: string; greeting: string; paragraphs: string[]; closing: string; signature: string; tone: string; length: string };

export type TailorState = {
  source: { jobId: string | null; title: string; company: string; description: string; location: string };
  baseResume: ResumeData;
  baseName: string;
  analysis: JobAnalysis | null;
  matches: KeywordMatch[];
  /** Requirement ids the user chose to add, each confirmed as true. */
  selected: string[];
  /** Requirement ids the user marked "learning / exposure". */
  learning: string[];
  changes: Change[];
  actionPlan: ActionItem[];
  letter: CoverLetter | null;
  scores: { before: AlignmentScore | null; after: AlignmentScore | null };
  /** Snapshots of the tailored résumé for undo / restore. */
  history: { at: string; label: string; resume: ResumeData }[];
  /** The tailored résumé the user is editing (starts as a copy of the base). */
  resume: ResumeData;
  engine: string;
  warnings: string[];
};
