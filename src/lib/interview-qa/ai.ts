import "server-only";
import { streamText, webSearch, webSearchEnabled } from "../ai";
import type { InterviewQ } from "./store";

const COACH = `You are CareerMatch's interview coach. You answer job-interview questions accurately and concisely.
Rules:
- Be correct first. If something depends on context, say so briefly.
- Use Markdown: short paragraphs, bullet lists, and fenced code blocks with a language tag (sql, python, js, dax, excel) for any code, formulas or queries.
- Never invent facts about companies' interview processes. Never claim a question was asked somewhere unless the provided context says so.`;

/** A model answer for one question. Behavioral answers are frameworks with placeholders, never invented experience. */
export async function draftAnswer(q: InterviewQ) {
  const behavioral = q.questionType === "Behavioral";
  const instructions = behavioral
    ? `Write a strong answer framework using the STAR method (Situation, Task, Action, Result).
- First, one line on what the interviewer is assessing.
- Then a STAR outline with [bracketed placeholders] the candidate fills from their own experience. Do NOT invent a story, employer, numbers or results.
- Finish with 3 short "Do" / "Avoid" tips.`
    : `Write a model interview answer: a direct 2-4 sentence answer first, then the key points as bullets, then a short code/query/formula example if it helps. Keep it under 300 words.`;
  let text = "";
  for await (const d of streamText({
    system: COACH,
    messages: [{ role: "user", content: `${instructions}\n\nRole context: ${[q.department, ...q.roles].filter(Boolean).join(", ") || "general"}${q.company ? ` · Company: ${q.company}` : ""}\n\nQuestion:\n${q.question}` }],
    effort: "low",
    maxTokens: 1200,
  }))
    text += d;
  return text.trim();
}

type Turn = { role: "user" | "assistant"; content: string };

/** "Ask AI" mode: answer from the platform's question bank (retrieved matches as grounding). */
export function bankAgent(query: string, related: InterviewQ[], history: Turn[]) {
  const context = related.length
    ? related.map((q, i) => `[${i + 1}] (${q.questionType}${q.company ? `, ${q.company}` : ""}) ${q.question}\nAnswer notes: ${(q.answer ?? "none").slice(0, 900)}`).join("\n\n")
    : "No matching questions in the bank.";
  return streamText({
    system: `${COACH}\nYou have retrieved questions from CareerMatch's interview bank below. Use them when relevant and cite them as [1], [2]. If they don't cover the request, answer from general knowledge and say the bank had no direct match.\n\nBANK:\n${context}`,
    messages: [...history.slice(-8), { role: "user", content: query }],
    effort: "low",
    maxTokens: 1500,
  });
}

/** "Search live web" mode: Google-grounded answer with its sources. */
export async function webAgent(query: string) {
  if (!webSearchEnabled()) return null;
  return webSearch(
    `${COACH}\nUse current web results to answer this interview-preparation request. Prefer official company career pages, recent interview reports and reputable guides. Summarise in Markdown; do not copy long passages.\n\nRequest: ${query}`,
  );
}
