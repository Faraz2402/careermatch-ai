import Link from "next/link";
import { Logo } from "@/components/ui";
import { LAWS, LEGAL, LEGAL_LINKS } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

/** Shared layout for the Privacy Policy and Terms: contents rail + numbered sections + references. */
export function LegalPage({ title, intro, sections, references, effective = LEGAL.effectiveDate, version = LEGAL.version }: { title: string; intro: React.ReactNode; sections: LegalSection[]; references: (keyof typeof LAWS)[]; effective?: string; version?: string }) {
  const all = [...sections, { id: "references", title: "References", body: null }];
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm text-slate-600" aria-label="Legal">
            {LEGAL_LINKS.map((l) => <Link key={l.href} href={l.href} className="hover:text-slate-900">{l.short}</Link>)}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[230px_1fr] lg:py-20">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1 text-sm" aria-label="Contents">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Contents</p>
            {all.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                {i < sections.length ? `${i + 1}. ` : ""}{s.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">Legal</p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">{title}</h1>
          <p className="mt-4 text-sm text-slate-500">
            Effective {effective} · Version {version}
          </p>
          <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-700">{intro}</div>

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-slate-200 pt-10 mt-10">
              <h2 className="font-display text-2xl sm:text-3xl">
                <span className="mr-2 text-slate-400">{i + 1}.</span>
                {s.title}
              </h2>
              <div className="legal-body mt-5 space-y-4 text-[15px] leading-relaxed text-slate-700">{s.body}</div>
            </section>
          ))}

          <section id="references" className="mt-10 scroll-mt-24 border-t border-slate-200 pt-10">
            <h2 className="font-display text-2xl sm:text-3xl">References</h2>
            <p className="mt-4 text-sm text-slate-600">Official texts of the laws this document relies on:</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
              {references.map((k) => (
                <li key={k}>
                  <a href={LAWS[k].url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600">
                    {LAWS[k].name}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {LEGAL.operator}
        {LEGAL_LINKS.map((l) => <span key={l.href}> · <Link href={l.href} className="hover:text-slate-800">{l.label}</Link></span>)}
      </footer>
    </div>
  );
}

/** Grievance Officer / contact block, from LEGAL settings. */
export function ContactBlock() {
  const missing = <span className="text-amber-700">to be published</span>;
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-surface p-5 text-sm sm:grid-cols-[180px_1fr]">
      <dt className="text-slate-500">Operator</dt>
      <dd className="font-medium text-slate-900">{LEGAL.operator}</dd>
      <dt className="text-slate-500">Grievance Officer</dt>
      <dd className="font-medium text-slate-900">{LEGAL.grievanceOfficer || missing}</dd>
      <dt className="text-slate-500">Email</dt>
      <dd className="font-medium text-slate-900">{LEGAL.grievanceEmail ? <a href={`mailto:${LEGAL.grievanceEmail}`} className="text-brand-700 underline underline-offset-2">{LEGAL.grievanceEmail}</a> : missing}</dd>
    </dl>
  );
}
