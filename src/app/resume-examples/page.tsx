import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CountryChips, Cta, RoleCard, SectionTitle } from "@/components/resume-examples/blocks";
import { ExampleSearch } from "@/components/resume-examples/example-search";
import { allSamples, popularRoles, publishedRoles, rolesIn, visibleCategories } from "@/lib/resume-examples/data";

export const metadata: Metadata = {
  title: "Resume Examples by Job and Country",
  description: "Fictional resume and CV examples for popular jobs in the US, UK, Canada, Australia, Germany and India, each written to local conventions, with writing guides and free PDF downloads.",
  alternates: { canonical: "/resume-examples" },
};

const FAQ: [string, string][] = [
  ["Are these real people's résumés?", "No. Every example is fictional: the names, employers, phone numbers, email addresses and figures are invented to show structure and tone. Use them for ideas, then write your own résumé with true details only."],
  ["Can I copy an example word for word?", "Please don't. Recruiters can usually tell when a résumé describes someone else's job, and claiming results you didn't achieve can cost you an offer. Borrow the structure and the way results are phrased, then replace every detail and number with your own."],
  ["Why do the examples change from country to country?", "Hiring conventions differ. Paper size, the usual length, whether to add a photo, which personal details belong, how dates are written and even the word for the document (résumé or CV) vary by country. Each country page explains the rules we followed and lists our sources."],
  ["Should my résumé be one page or two?", "It depends on your experience and your market. Early-career résumés often fit on one page; experienced candidates commonly use two. The country pages show what sources recommend locally, including where they disagree."],
  ["Will these layouts work with applicant tracking systems?", "They're designed to: a single reading order, real text (not images), standard section headings and no tables for core content. No layout can guarantee how a particular employer's system will read it, so keep formatting simple."],
  ["How are the PDF downloads sized?", "Each PDF uses the paper size that's usual in its country: US Letter for the United States and Canada, A4 for the others."],
];

export default function ResumeExamplesPage() {
  const cats = visibleCategories();
  const search = [
    ...publishedRoles().map((r) => ({ name: r.name, href: `/resume-examples/${r.category}/${r.slug}`, group: cats.find((c) => c.slug === r.category)?.name ?? "" })),
    ...cats.map((c) => ({ name: c.name, href: `/resume-examples/${c.slug}`, group: "Category" })),
  ];
  return (
    <div>
      {/* 1. Heading + search */}
      <section className="text-center">
        <p className="text-sm font-bold tracking-[0.14em] text-brand-700 uppercase">Resume examples</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.05] font-normal text-slate-900 sm:text-6xl">Résumé examples for <em className="text-brand-600 italic">your job, in your country.</em></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">{allSamples().length} fictional examples across {publishedRoles().length} roles, each written to local hiring conventions, with a guide and a free PDF.</p>
        <ExampleSearch items={search} />
      </section>

      {/* 2. Country filter */}
      <section className="mt-10" aria-labelledby="rx-countries">
        <h2 id="rx-countries" className="mb-3 text-center text-sm font-bold text-slate-600">Browse by country</h2>
        <div className="flex justify-center"><CountryChips /></div>
      </section>

      {/* 3. Most popular */}
      <section className="mt-14">
        <SectionTitle sub="Common roles people look for first.">Most popular</SectionTitle>
        <div className="mt-5 flex snap-x gap-5 overflow-x-auto pb-3">
          {popularRoles().map((r) => <RoleCard key={r.slug} role={r} className="w-52 shrink-0 snap-start sm:w-60" />)}
        </div>
      </section>

      {/* 4. One section per category */}
      {cats.map((c) => {
        const roles = rolesIn(c.slug);
        return (
          <section key={c.slug} className="mt-14" aria-labelledby={`cat-${c.slug}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id={`cat-${c.slug}`} className="font-display text-2xl font-bold text-slate-900">{c.name}</h2>
                <p className="mt-1 max-w-3xl text-slate-600">{c.blurb}</p>
              </div>
              <Link href={`/resume-examples/${c.slug}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">View all <ArrowRight className="size-4" aria-hidden /></Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {roles.slice(0, 8).map((r) => <RoleCard key={r.slug} role={r} />)}
            </div>
          </section>
        );
      })}

      {/* 5. FAQ */}
      <section className="mx-auto mt-16 max-w-3xl">
        <SectionTitle>Frequently asked questions</SectionTitle>
        <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group p-5">
              <summary className="cursor-pointer list-none font-bold text-slate-900 marker:hidden">{q}<span className="float-right text-brand-600 transition group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 6. CTA */}
      <Cta />
    </div>
  );
}
