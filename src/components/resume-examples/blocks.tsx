import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cx } from "@/lib/format";
import { COUNTRY_NAMES, COUNTRY_SLUGS, coverSample, FLAG, formatFor, roleHref, samplesFor } from "@/lib/resume-examples/data";
import { COUNTRY_CODES, type CountryCode } from "@/lib/resume-examples/types";
import { SampleCard } from "./sample-card";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5" aria-hidden />}
          {it.href ? <Link href={it.href} className="hover:text-brand-700 hover:underline">{it.label}</Link> : <span aria-current="page" className="font-semibold text-slate-700">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

/** Country filter: links to each country's page (or, given `base`, to the same role in each country). */
export function CountryChips({ active, base, label = "Country" }: { active?: CountryCode; base?: string; label?: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      {COUNTRY_CODES.map((c) => {
        const href = base ? `${base}/${COUNTRY_SLUGS[c]}` : `/resume-examples/country/${COUNTRY_SLUGS[c]}`;
        const on = c === active;
        return (
          <Link key={c} href={href} aria-current={on ? "page" : undefined} className={cx("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", on ? "border-transparent bg-brand-600 text-white shadow" : "border-slate-200 bg-surface text-slate-700 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700")}>
            <span aria-hidden>{FLAG[c]}</span> {COUNTRY_NAMES[c]}
          </Link>
        );
      })}
    </nav>
  );
}

/** A role card: the role's cover sample, scaled, with how many examples exist. */
export function RoleCard({ role, country, className }: { role: { slug: string; name: string; category: string }; country?: CountryCode; className?: string }) {
  const s = coverSample(role.slug, country);
  if (!s) return null;
  const n = samplesFor({ role: role.slug }).length;
  return <SampleCard sample={s} format={formatFor(s.country)} href={roleHref(role)} label={`${role.name} examples`} sub={`${n} examples · ${new Set(samplesFor({ role: role.slug }).map((x) => x.level)).size} levels`} className={className} />;
}

export function Cta() {
  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-[#0a1020] px-6 py-12 text-center text-white sm:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_280px_at_85%_0%,rgba(132,87,255,0.45),transparent_70%),radial-gradient(480px_280px_at_0%_100%,rgba(25,198,232,0.3),transparent_70%)]" />
      <div className="relative">
        <h2 className="font-serif text-4xl leading-tight sm:text-5xl">Now make one that&rsquo;s <em className="text-[#a3b8ff] italic">truly yours.</em></h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#c9d0ea]">Upload your own résumé and CareerMatch helps you tailor it to each job, using only your real experience.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-bold text-[#10152b] shadow-lg transition hover:-translate-y-0.5">Build my résumé <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="/resume-examples" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-bold transition hover:bg-white/10">Browse more examples</Link>
        </div>
      </div>
    </section>
  );
}

export const SectionTitle = ({ id, children, sub }: { id?: string; children: React.ReactNode; sub?: React.ReactNode }) => (
  <div id={id} className="scroll-mt-24">
    <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{children}</h2>
    {sub && <p className="mt-1.5 max-w-3xl text-slate-600">{sub}</p>}
  </div>
);
