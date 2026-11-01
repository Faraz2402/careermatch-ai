import "server-only";
import { createHash } from "node:crypto";
import { db } from "../db";
import { INTERVIEW_SOURCES, sourceUpdatedAt, type InterviewSource, type RawQuestion } from "./sources";
import STAR from "./star-answers.json";
import { tagText } from "./taxonomy";

/** Pre-drafted STAR sample answers for behavioral questions whose source has none (see scripts/draft-star-answers.mts). */
const STAR_ANSWERS: Record<string, string> = STAR;

const RUN_PREFIX = "iq:";
/** Collections change slowly: refresh every few days. */
const STALE_AFTER_MS = 3 * 24 * 3600_000;

const hashOf = (r: RawQuestion) => createHash("sha1").update(JSON.stringify([r.question, r.answer ?? "", r.company ?? "", r.type, r.roles, r.skills, r.tools])).digest("hex");

function toRow(s: InterviewSource, r: RawQuestion, updated: Date | null) {
  const tags = tagText(r.question, r.answer);
  return {
    id: `${s.key}:${r.sourceId}`,
    source: s.key,
    sourceUrl: r.url,
    license: s.license,
    attribution: s.attribution,
    company: r.company ?? null,
    department: r.department,
    roles: JSON.stringify(r.roles),
    experienceLevel: r.level ?? null,
    questionType: r.type,
    roundType: r.roundType ?? null,
    question: r.question,
    tools: JSON.stringify([...new Set([...(r.tools ?? []), ...tags.tools])]),
    skills: JSON.stringify([...new Set([...(r.skills ?? []), ...tags.skills])].slice(0, 8)),
    sourceUpdatedAt: updated,
    hash: hashOf(r),
  };
}

/** Pull one collection: insert new questions, update changed ones, refresh lastSeenAt. AI-drafted answers are kept. */
async function ingestSource(s: InterviewSource) {
  const started = Date.now();
  try {
    const [rows, updated] = await Promise.all([s.fetch(), sourceUpdatedAt(s)]);
    const existing = new Map((await db.interviewQuestion.findMany({ where: { source: s.key }, select: { id: true, hash: true, answerOrigin: true } })).map((e) => [e.id, e]));
    const now = new Date();
    // A collection can list the same question twice (e.g. under two principles): keep the first.
    const seen = new Set<string>();
    const fresh = rows.filter((r) => !seen.has(r.sourceId) && seen.add(r.sourceId)).map((r) => ({ raw: r, row: toRow(s, r, updated) }));
    const create = fresh.filter((f) => !existing.has(f.row.id));
    const changed = fresh.filter((f) => existing.get(f.row.id) && existing.get(f.row.id)!.hash !== f.row.hash);
    if (create.length)
      await db.interviewQuestion.createMany({ data: create.map((f) => ({ ...f.row, answer: f.raw.answer ?? STAR_ANSWERS[f.row.id] ?? null, answerOrigin: f.raw.answer ? "source" : STAR_ANSWERS[f.row.id] ? "ai" : null, lastSeenAt: now })) });
    for (const f of changed) {
      const prev = existing.get(f.row.id)!;
      // A source answer replaces an AI draft; with no source answer, keep whatever we have.
      const answer = f.raw.answer ? { answer: f.raw.answer, answerOrigin: "source" } : prev.answerOrigin === "source" ? { answer: null, answerOrigin: null } : {};
      await db.interviewQuestion.update({ where: { id: f.row.id }, data: { ...f.row, ...answer, lastSeenAt: now } });
    }
    await db.interviewQuestion.updateMany({ where: { source: s.key, id: { in: fresh.map((f) => f.row.id) } }, data: { lastSeenAt: now } });
    const unanswered = await db.interviewQuestion.findMany({ where: { source: s.key, answer: null, id: { in: Object.keys(STAR_ANSWERS) } }, select: { id: true } });
    for (const { id } of unanswered) await db.interviewQuestion.update({ where: { id }, data: { answer: STAR_ANSWERS[id], answerOrigin: "ai" } });
    await db.sourceRun.create({ data: { source: `${RUN_PREFIX}${s.key}`, durationMs: Date.now() - started, ok: true, count: rows.length } });
    return { source: s.key, count: rows.length, created: create.length, updated: changed.length };
  } catch (e) {
    await db.sourceRun.create({ data: { source: `${RUN_PREFIX}${s.key}`, durationMs: Date.now() - started, ok: false, count: 0, error: String(e).slice(0, 500) } });
    return { source: s.key, error: String(e) };
  }
}

/** Refresh the collections that are due (or all, when forced), within a time budget. */
export async function refreshInterviewQuestions({ force = false, budgetMs = 25_000 } = {}) {
  const deadline = Date.now() + budgetMs;
  const results = [];
  for (const s of INTERVIEW_SOURCES) {
    if (Date.now() > deadline) {
      results.push({ source: s.key, deferred: true });
      continue;
    }
    if (!force) {
      const last = await db.sourceRun.findFirst({ where: { source: `${RUN_PREFIX}${s.key}`, ok: true }, orderBy: { startedAt: "desc" }, select: { startedAt: true } });
      if (last && Date.now() - last.startedAt.getTime() < STALE_AFTER_MS) continue;
    }
    results.push(await ingestSource(s));
  }
  return results;
}
