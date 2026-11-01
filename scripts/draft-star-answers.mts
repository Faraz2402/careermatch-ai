// Drafts STAR sample answers for behavioral interview questions whose source has none,
// and saves them to src/lib/interview-qa/star-answers.json (applied by the ingest).
// Run: NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env scripts/draft-star-answers.mts
import { readFileSync, writeFileSync } from "node:fs";
import { streamText } from "../src/lib/ai";
import { db } from "../src/lib/db";
import { refreshInterviewQuestions } from "../src/lib/interview-qa/ingest";

const FILE = "src/lib/interview-qa/star-answers.json";

const SYSTEM = `You are CareerMatch's interview coach. You write model answers to behavioral interview questions using the STAR method.
Rules:
- Write ONE worked example answer a strong candidate could give, as a clearly illustrative story (no real employer names; say "my team", "a fintech start-up", etc.).
- Never claim anything about a company's interview process beyond what the prompt says.
- Markdown only, under 230 words, in exactly this shape:
_What they're assessing:_ one line.

**Situation:** 1-2 sentences.

**Task:** 1 sentence.

**Action:**
- 3-4 concrete bullets in first person

**Result:** 1-2 sentences with a measurable outcome.

**Learning:** 1 sentence.

_Make it yours:_ one line on which detail to swap for the candidate's own experience.`;

async function draft(q: { question: string; company: string | null; roundType: string | null }) {
  const lp = q.roundType?.startsWith("Leadership Principle") ? `\nThis question maps to Amazon's Leadership Principle "${q.roundType.split(" · ")[1]}" - make the story show it and name it in the assessing line.` : "";
  let text = "";
  for await (const d of streamText({ system: SYSTEM, messages: [{ role: "user", content: `Question${q.company ? ` (listed for ${q.company} interviews)` : ""}: ${q.question}${lp}` }], effort: "low", maxTokens: 1600 })) text += d;
  return text.trim();
}

const out: Record<string, string> = JSON.parse(readFileSync(FILE, "utf8"));
console.log("ingest", await refreshInterviewQuestions({ force: true, budgetMs: 120_000 }));
const todo = (await db.interviewQuestion.findMany({ where: { questionType: "Behavioral", status: "published", OR: [{ answerOrigin: null }, { answerOrigin: { not: "source" } }], NOT: { source: "user" } }, select: { id: true, question: true, company: true, roundType: true } })).filter((q) => !out[q.id]);
console.log(`${todo.length} to draft`);
let done = 0;
const worker = async () => {
  for (let q = todo.shift(); q; q = todo.shift()) {
    try {
      const a = await draft(q);
      if (/\*\*Situation:\*\*/.test(a) && /\*\*Result:\*\*/.test(a)) out[q.id] = a;
      else console.warn("skipped (shape)", q.question);
    } catch (e) {
      console.warn("failed", q.question, String(e).slice(0, 120));
    }
    if (++done % 10 === 0) {
      writeFileSync(FILE, JSON.stringify(out, null, 1));
      console.log(done);
    }
  }
};
await Promise.all([worker(), worker()]);
writeFileSync(FILE, JSON.stringify(out, null, 1));
console.log(`saved ${Object.keys(out).length}`);
await db.$disconnect();
