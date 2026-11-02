import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, CountryChips, Cta, SectionTitle } from "@/components/resume-examples/blocks";
import { SampleCard } from "@/components/resume-examples/sample-card";
import { COUNTRY_NAMES, COUNTRY_SLUGS, countryFromSlug, formatFor, roleOf, rulesFor, sampleHref, samplesFor, termFor, visibleCategories } from "@/lib/resume-examples/data";
import { COUNTRY_CODES } from "@/lib/resume-examples/types";

type P = { params: Promise<{ country: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => COUNTRY_CODES.map((c) => ({ country: COUNTRY_SLUGS[c] }));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = countryFromSlug((await params).country);
  if (!c) return {};
  const term = termFor(c);
  return {
    title: `${term} Examples and Rules for ${COUNTRY_NAMES[c]}`,
    description: `How to write a ${term} for ${COUNTRY_NAMES[c]}: paper size, length, photos, personal details, date format and education terms, with sources, plus fictional examples for popular jobs.`,
    alternates: { canonical: `/resume-examples/country/${COUNTRY_SLUGS[c]}` },
  };
}

export default async function CountryPage({ params }: P) {
  const c = countryFromSlug((await params).country);
  if (!c) notFound();
  const r = rulesFor(c);
  const term = termFor(c);
  const rows: [string, string, string][] = r
    ? [
        ["Usual term", r.term.value, r.term.note],
        ["Paper size", r.paper.value, r.paper.note],
        ["Usual length", r.length.value, r.length.note],
        ["Photo", r.photo.value, r.photo.note],
        ["Date format", r.dateFormat.example, r.dateFormat.note],
        ["Spelling", r.spelling, ""],
        ["Currency", `${r.currency.code} (${r.currency.symbol})`, ""],
      ]
    : [];
  return (
    <div>
      <Breadcrumbs items={[{ label: "Resume examples", href: "/resume-examples" }, { label: COUNTRY_NAMES[c] }]} />
      <h1 className="font-serif text-5xl leading-[1.05] text-slate-900">{term} examples and rules for {COUNTRY_NAMES[c]}</h1>
      <p className="mt-3 max-w-3xl text-lg text-slate-600">What employers in {COUNTRY_NAMES[c]} usually expect, researched from the public sources listed below, and fictional examples written to match.</p>
      <div className="mt-6"><CountryChips active={c} /></div>

      {r ? (
        <section className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionTitle>The rules we follow</SectionTitle>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-surface">
              {rows.map(([k, v, note]) => (
                <div key={k} className="grid gap-1 border-b border-slate-200 p-4 last:border-0 sm:grid-cols-[9rem_1fr]">
                  <p className="text-sm font-bold text-slate-500">{k}</p>
                  <div><p className="font-semibold text-slate-900">{v}</p>{note && <p className="mt-0.5 text-sm text-slate-600">{note}</p>}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-surface p-4"><p className="font-bold text-slate-900">Usually include</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{r.include.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-4"><p className="font-bold text-slate-900">Usually leave out</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{r.leaveOut.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-surface p-4">
              <p className="font-bold text-slate-900">Education terms</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">{r.education.terms.map((t) => <li key={t.term}><b>{t.term}</b>: {t.meaning}</li>)}</ul>
              <p className="mt-2 text-sm text-slate-600">{r.education.note}</p>
            </div>
          </div>
          <div className="space-y-6">
            {r.disagreements.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                <p className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4" aria-hidden /> Where sources disagree</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">{r.disagreements.map((d) => <li key={d}>{d}</li>)}</ul>
              </div>
            )}
            <div className="rounded-2xl border border-slate-200 bg-surface p-5">
              <p className="font-bold text-slate-900">Tips</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{r.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-surface p-5">
              <p className="font-bold text-slate-900">Sources</p>
              <ul className="mt-2 space-y-2 text-sm">
                {r.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 font-semibold text-brand-700 hover:underline">{s.title} <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden /></a>
                    <span className="block text-xs text-slate-500">{s.publisher} · checked {s.accessed}{s.how === "search-result" ? " · from its search summary" : ""}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Rules change and employers differ; check the employer&rsquo;s own instructions first. Our sample phone number: {r.fictionalPhone.pattern}. {r.fictionalPhone.note}</p>
            </div>
          </div>
        </section>
      ) : (
        <p className="mt-10 rounded-2xl border border-slate-200 bg-surface p-5 text-slate-600">The rules summary for this country is being prepared.</p>
      )}

      {visibleCategories().map((cat) => {
        const list = samplesFor({ country: c, category: cat.slug });
        if (!list.length) return null;
        return (
          <section key={cat.slug} className="mt-12">
            <SectionTitle>{cat.name}</SectionTitle>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {list.map((s) => <SampleCard key={s.id} sample={s} format={formatFor(c)} href={sampleHref(s)} label={roleOf(s.role)?.name} />)}
            </div>
          </section>
        );
      })}
      <Cta />
    </div>
  );
}
