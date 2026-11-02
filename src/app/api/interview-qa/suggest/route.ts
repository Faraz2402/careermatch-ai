import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { publishedQuestions, score } from "@/lib/interview-qa/store";
import { ALL_ROLES, ALL_SKILLS, DEPARTMENT_NAMES, TOOLS } from "@/lib/interview-qa/taxonomy";

export const runtime = "nodejs";

/** Instant suggestions for the header search: departments, roles, tools, skills, companies and questions. */
export async function GET(req: Request) {
  const { error } = await apiUser();
  if (error) return error;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ facets: [], questions: [] });
  const all = await publishedQuestions().catch(() => []);
  const companies = [...new Set(all.map((x) => x.company).filter((c): c is string => !!c))];
  const pick = (kind: string, list: string[]) => list.filter((v) => v.toLowerCase().includes(q)).slice(0, 4).map((value) => ({ kind, value }));
  const facets = [...pick("dept", DEPARTMENT_NAMES), ...pick("role", ALL_ROLES), ...pick("tool", TOOLS.map((t) => t.name)), ...pick("skill", ALL_SKILLS), ...pick("company", companies)].slice(0, 8);
  const questions = all
    .map((x) => ({ x, s: score(x, q) }))
    .filter((r) => r.s > 1)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map(({ x }) => ({ id: x.id, question: x.question.split("\n")[0].slice(0, 140), type: x.questionType }));
  return NextResponse.json({ facets, questions });
}
