import { Suspense } from "react";
import { InterviewQa } from "@/components/interview-qa/interview-qa";
import { requireUser } from "@/lib/auth";
import { applyFilters, facets, parseFilters, publishedQuestions } from "@/lib/interview-qa/store";

export const metadata = { title: "Interview Q&A" };

export default async function InterviewQaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const raw = await searchParams;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const x of Array.isArray(v) ? v : v ? [v] : []) sp.append(k, x);
  const f = parseFilters(sp);
  const all = await publishedQuestions();
  const results = applyFilters(all, f);
  const scope = applyFilters(all, { departments: f.departments, roles: f.roles });
  const initial = { total: results.length, items: results.slice(0, 24), pageSize: 24, facets: facets(scope), overall: all.length };
  return (
    <Suspense>
      <InterviewQa initial={initial} />
    </Suspense>
  );
}
