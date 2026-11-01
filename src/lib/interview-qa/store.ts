import "server-only";
import { db } from "../db";
import { ALL_DEPARTMENTS } from "./taxonomy";

export type InterviewQ = {
  id: string;
  source: string;
  sourceUrl: string;
  license: string;
  attribution: string;
  company: string | null;
  department: string;
  roles: string[];
  experienceLevel: string | null;
  questionType: string;
  roundType: string | null;
  question: string;
  answer: string | null;
  answerOrigin: string | null;
  tools: string[];
  skills: string[];
  dateAsked: string | null;
  sourceUpdatedAt: string | null;
};

export type IqFilters = { departments?: string[]; roles?: string[]; tools?: string[]; skills?: string[]; companies?: string[]; types?: string[]; q?: string };

const parse = (s: string): string[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

type Row = Awaited<ReturnType<typeof db.interviewQuestion.findMany>>[number];
export const toQ = (r: Row): InterviewQ => ({
  id: r.id,
  source: r.source,
  sourceUrl: r.sourceUrl,
  license: r.license,
  attribution: r.attribution,
  company: r.company,
  department: r.department,
  roles: parse(r.roles),
  experienceLevel: r.experienceLevel,
  questionType: r.questionType,
  roundType: r.roundType,
  question: r.question,
  answer: r.answer,
  answerOrigin: r.answerOrigin,
  tools: parse(r.tools),
  skills: parse(r.skills),
  dateAsked: r.dateAsked?.toISOString() ?? null,
  sourceUpdatedAt: r.sourceUpdatedAt?.toISOString() ?? null,
});

// The published set is small (a few thousand rows): keep it in memory briefly and filter in code,
// which behaves the same on SQLite (local) and Postgres (production).
let cache: { at: number; rows: InterviewQ[] } | null = null;
const TTL = 5 * 60_000;

export async function publishedQuestions() {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const rows = (await db.interviewQuestion.findMany({ where: { status: "published" }, orderBy: [{ sourceUpdatedAt: "desc" }, { id: "asc" }] })).map(toQ);
  cache = { at: Date.now(), rows };
  return rows;
}
export const invalidateInterviewCache = () => {
  cache = null;
};

const words = (s: string) => s.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];
const STOP = new Set(["the", "a", "an", "of", "to", "in", "and", "or", "for", "is", "what", "how", "do", "you", "on", "with", "are", "your", "interview", "questions", "question"]);

/** Relevance of a question to a free-text query (word overlap, weighted towards the question text). */
export function score(q: InterviewQ, query: string) {
  const terms = words(query).filter((w) => !STOP.has(w));
  if (!terms.length) return 0;
  const head = q.question.toLowerCase();
  const meta = [q.company, q.department, q.questionType, ...q.roles, ...q.tools, ...q.skills].join(" ").toLowerCase();
  const body = (q.answer ?? "").slice(0, 1500).toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (head.includes(t)) s += 3;
    if (meta.includes(t)) s += 2;
    if (body.includes(t)) s += 0.5;
  }
  return s / terms.length;
}

export function applyFilters(rows: InterviewQ[], f: IqFilters) {
  const has = (list: string[] | undefined) => !!list && list.length > 0;
  let out = rows.filter(
    (q) =>
      (!has(f.departments) || f.departments!.includes(q.department) || q.department === ALL_DEPARTMENTS) &&
      (!has(f.roles) || q.roles.length === 0 || q.roles.some((r) => f.roles!.includes(r))) &&
      (!has(f.tools) || q.tools.some((t) => f.tools!.includes(t))) &&
      (!has(f.skills) || q.skills.some((s) => f.skills!.includes(s))) &&
      (!has(f.companies) || (!!q.company && f.companies!.includes(q.company))) &&
      (!has(f.types) || f.types!.includes(q.questionType)),
  );
  if (f.q?.trim()) out = out.map((q) => ({ q, s: score(q, f.q!) })).filter((x) => x.s > 0.6).sort((a, b) => b.s - a.s).map((x) => x.q);
  return out;
}

/** Counts for the filter UI (computed on the department/role-filtered set so options stay relevant). */
export function facets(rows: InterviewQ[]) {
  const count = (pick: (q: InterviewQ) => (string | null)[]) => {
    const m = new Map<string, number>();
    for (const q of rows) for (const v of pick(q)) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return Object.fromEntries([...m].sort((a, b) => b[1] - a[1]));
  };
  return {
    total: rows.length,
    departments: count((q) => [q.department]),
    roles: count((q) => q.roles),
    tools: count((q) => q.tools),
    skills: count((q) => q.skills),
    companies: count((q) => [q.company]),
    types: count((q) => [q.questionType]),
  };
}

/** The questions most related to a query, for grounding AI answers. */
export async function relatedQuestions(query: string, limit = 6) {
  return (await publishedQuestions())
    .map((q) => ({ q, s: score(q, query) }))
    .filter((x) => x.s > 0.8)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.q);
}

export function parseFilters(sp: URLSearchParams): IqFilters {
  const list = (k: string) => sp.getAll(k).flatMap((v) => v.split("|")).map((v) => v.trim()).filter(Boolean).slice(0, 30);
  return { departments: list("dept"), roles: list("role"), tools: list("tool"), skills: list("skill"), companies: list("company"), types: list("type"), q: (sp.get("q") ?? "").slice(0, 200) };
}
