import { BrainCircuit, LibraryBig } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { InterviewQa } from "@/components/interview-qa/interview-qa";
import { SkillAssessment } from "@/components/interview-qa/skill-assessment";
import { requireUser } from "@/lib/auth";
import { cx } from "@/lib/format";
import { applyFilters, facets, parseFilters, publishedQuestions } from "@/lib/interview-qa/store";

export const metadata = { title: "Interview Q&A" };

const TABS = [
  { id: "bank", label: "Question bank", href: "/interview-qa", icon: LibraryBig },
  { id: "assessment", label: "Start your Skill Assessment", href: "/interview-qa?tab=assessment", icon: BrainCircuit },
] as const;

export default async function InterviewQaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const raw = await searchParams;
  const tab = raw.tab === "assessment" ? "assessment" : "bank";
  const tabs = (
    <nav aria-label="Interview Q&A sections" className="mb-6 flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 sm:w-fit">
      {TABS.map(({ id, label, href, icon: Icon }) => (
        <Link key={id} href={href} scroll={false} aria-current={tab === id ? "page" : undefined} className={cx("flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap transition", tab === id ? "bg-surface text-brand-700 shadow" : "text-slate-600 hover:text-slate-900")}>
          <Icon className="size-4" aria-hidden />
          {label}
          {id === "assessment" && <span className="rounded-full bg-[#ffc857] px-1.5 py-0.5 text-[10px] font-extrabold text-[#4a3000]">New</span>}
        </Link>
      ))}
    </nav>
  );
  if (tab === "assessment")
    return (
      <>
        {tabs}
        <SkillAssessment />
      </>
    );

  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const x of Array.isArray(v) ? v : v ? [v] : []) sp.append(k, x);
  const f = parseFilters(sp);
  const all = await publishedQuestions();
  const results = applyFilters(all, f);
  const scope = applyFilters(all, { departments: f.departments, roles: f.roles });
  const initial = { total: results.length, items: results.slice(0, 24), pageSize: 24, facets: facets(scope), overall: all.length };
  return (
    <>
      {tabs}
      <Suspense>
        <InterviewQa initial={initial} />
      </Suspense>
    </>
  );
}
