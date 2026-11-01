import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { applyFilters, facets, parseFilters, publishedQuestions } from "@/lib/interview-qa/store";

export const runtime = "nodejs";

const PAGE = 24;

/** Filtered interview questions (one page) plus facet counts for the filter UI. */
export async function GET(req: Request) {
  const { error } = await apiUser();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const f = parseFilters(sp);
  const page = Math.max(0, Number(sp.get("page") ?? 0) || 0);
  const all = await publishedQuestions();
  const results = applyFilters(all, f);
  // Options for tools, skills and companies follow the department and role choice.
  const scope = applyFilters(all, { departments: f.departments, roles: f.roles });
  return NextResponse.json({ total: results.length, items: results.slice(page * PAGE, (page + 1) * PAGE), pageSize: PAGE, facets: facets(scope), overall: all.length });
}
