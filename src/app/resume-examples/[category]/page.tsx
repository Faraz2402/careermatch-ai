import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, CountryChips, Cta, SectionTitle } from "@/components/resume-examples/blocks";
import { SampleCard } from "@/components/resume-examples/sample-card";
import { categoryOf, formatFor, LEVEL_LABEL, roleHref, rolesIn, sampleHref, samplesFor, visibleCategories } from "@/lib/resume-examples/data";

type P = { params: Promise<{ category: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => visibleCategories().map((c) => ({ category: c.slug }));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = categoryOf((await params).category);
  if (!c) return {};
  const roles = rolesIn(c.slug).map((r) => r.name);
  return {
    title: `${c.name} Resume Examples`,
    description: `Fictional ${c.name.toLowerCase()} resume and CV examples (${roles.slice(0, 4).join(", ")}${roles.length > 4 ? " and more" : ""}) for six countries, with writing tips and PDF downloads.`,
    alternates: { canonical: `/resume-examples/${c.slug}` },
  };
}

export default async function CategoryPage({ params }: P) {
  const c = categoryOf((await params).category);
  const roles = c ? rolesIn(c.slug) : [];
  if (!c || !roles.length) notFound();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Resume examples", href: "/resume-examples" }, { label: c.name }]} />
      <h1 className="font-serif text-5xl leading-[1.05] text-slate-900">{c.name} résumé examples</h1>
      <p className="mt-3 max-w-3xl text-lg text-slate-600">{c.blurb}</p>
      <div className="mt-6"><CountryChips /></div>
      {roles.map((r) => (
        <section key={r.slug} className="mt-12" aria-labelledby={`role-${r.slug}`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionTitle id={`role-${r.slug}`}>{r.name}</SectionTitle>
            <Link href={roleHref(r)} className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-700 hover:underline">Guide and all {r.name.toLowerCase()} examples <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {samplesFor({ role: r.slug }).map((s) => <SampleCard key={s.id} sample={s} format={formatFor(s.country)} href={sampleHref(s)} sub={`${LEVEL_LABEL[s.level]} · ${s.content.location}`} />)}
          </div>
        </section>
      ))}
      <Cta />
    </div>
  );
}
