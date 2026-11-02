import { AlertTriangle, ArrowRight, BadgeCheck, Download, XCircle } from "lucide-react";
import Link from "next/link";
import { categoryOf, COUNTRY_NAMES, COUNTRY_SLUGS, FLAG, formatFor, guideFor, LEVEL_LABEL, NOTICE, roleHref, rolesIn, rulesFor, sampleHref, samplesFor, termFor, coverSample } from "@/lib/resume-examples/data";
import { COUNTRY_CODES, LEVELS, type CountryCode, type Sample } from "@/lib/resume-examples/types";
import { Breadcrumbs, CountryChips, Cta, SectionTitle } from "./blocks";
import { PAGE_PX, ResumeDoc, THEMES } from "./resume-doc";
import { SampleCard } from "./sample-card";
import { Scaled } from "./scaled";
import { Tabs } from "./tabs";

const fmtUpdated = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="mt-6 font-display text-lg font-bold text-slate-900">{children}</h3>;
const List = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-3 space-y-2">
    {items.map((x, i) => (
      <li key={i} className="flex gap-2.5 text-slate-700"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden /><span>{x}</span></li>
    ))}
  </ul>
);

function Grid({ samples, label }: { samples: Sample[]; label?: (s: Sample) => string }) {
  if (!samples.length) return <p className="text-slate-600">No examples here yet.</p>;
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
      {samples.map((s) => <SampleCard key={s.id} sample={s} format={formatFor(s.country)} href={sampleHref(s)} label={label?.(s)} sub={`${LEVEL_LABEL[s.level]} · ${s.content.location}`} />)}
    </div>
  );
}

/** Full role page: a large preview, filtered samples, the writing guide and country tips. */
export function RolePage({ role, country }: { role: { slug: string; name: string; category: string }; country?: CountryCode }) {
  const g = guideFor(role.slug);
  const cat = categoryOf(role.category)!;
  const main = coverSample(role.slug, country)!;
  const format = formatFor(main.country);
  const rules = rulesFor(main.country);
  const term = termFor(main.country);
  const page = PAGE_PX[format.paper];
  const all = samplesFor({ role: role.slug });
  const siblings = rolesIn(role.category).filter((r) => r.slug !== role.slug);
  const pdf = `/api/resume-examples/${main.id}/pdf`;
  const title = country ? `${role.name} ${term} example for ${COUNTRY_NAMES[country]}` : `${role.name} resume examples`;

  const contents: [string, string][] = [
    ["format", "Format and length"], ["design", "Design tips"], ["sections", "Top sections"], ["recruiters", "What recruiters look for"], ["experience", "Writing your experience"],
    ["numbers", "Showing results with numbers"], ["no-experience", "Applying with no experience"], ["hard-skills", "Hard skills"], ["soft-skills", "Soft skills"], ["education", "Education"],
    ["certifications", "Certifications"], ["summary", "Summary or objective?"], ["extras", "Extra sections"], ["takeaways", "Key takeaways"], ["weak-strong", "Weak vs strong examples"], ["country-tips", "Country-specific tips"], ["related", "Related roles"],
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Resume examples", href: "/resume-examples" }, { label: cat.name, href: `/resume-examples/${cat.slug}` }, { label: role.name, href: country ? roleHref(role) : undefined }, ...(country ? [{ label: COUNTRY_NAMES[country] }] : [])]} />

      {/* 1. Title, date, large preview */}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
        <div>
          <h1 className="font-serif text-4xl leading-[1.05] text-slate-900 sm:text-5xl">{title}</h1>
          {g && <p className="mt-2 text-sm text-slate-500">Last updated <time dateTime={g.updated}>{fmtUpdated(g.updated)}</time></p>}
          {g && <p className="mt-4 text-lg text-slate-600">{g.intro}</p>}
          <p className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{NOTICE}</p>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            {[["Shown", `${FLAG[main.country]} ${COUNTRY_NAMES[main.country]} · ${LEVEL_LABEL[main.level]}`], ["Template", `${THEMES[main.template].label}: ${THEMES[main.template].blurb}`], ["Paper", format.paper], ["Dates", format.dateFormat === "MM/YYYY" ? "MM/YYYY" : "Mon YYYY"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-surface p-3"><dt className="text-xs font-bold text-slate-500 uppercase">{k}</dt><dd className="mt-0.5 font-semibold text-slate-800">{v}</dd></div>
            ))}
          </dl>
          <a href={pdf} className="btn-primary mt-5 w-full !py-3 sm:w-auto"><Download className="size-4" aria-hidden /> Download this example (PDF, {format.paper})</a>
          <div className="mt-6">
            <p className="mb-2 text-sm font-bold text-slate-600">See this role in another country</p>
            <CountryChips active={country} base={roleHref(role)} label="Countries for this role" />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-3 sm:p-5">
          <div className="overflow-hidden rounded-xl shadow-xl">
            <Scaled pageW={page.w} pageH={page.h} initial={0.6}>
              <ResumeDoc sample={main} format={format} />
            </Scaled>
          </div>
        </div>
      </div>

      {/* 2-3. Tabs + grid */}
      <section className="mt-14">
        <SectionTitle sub="Each country uses its own format, paper size and local qualifications.">More {role.name.toLowerCase()} examples</SectionTitle>
        <div className="mt-5">
          <Tabs
            tabs={[
              { label: "All", panel: <Grid samples={all} label={(s) => `${COUNTRY_NAMES[s.country]}`} /> },
              {
                label: "By experience",
                panel: (
                  <div className="space-y-8">
                    {LEVELS.map((l) => (
                      <div key={l}>
                        <h3 className="mb-3 font-display text-lg font-bold text-slate-900">{LEVEL_LABEL[l]}</h3>
                        <Grid samples={all.filter((s) => s.level === l)} label={(s) => COUNTRY_NAMES[s.country]} />
                      </div>
                    ))}
                  </div>
                ),
              },
              { label: "By role", panel: <Grid samples={siblings.map((r) => coverSample(r.slug, main.country)!).filter(Boolean)} label={(s) => `${siblings.find((r) => r.slug === s.role)?.name}`} /> },
            ]}
          />
        </div>
      </section>

      {g && (
        <div className="mt-14 grid gap-10 lg:grid-cols-[16rem_1fr]">
          {/* 4. Contents */}
          <nav aria-label="Contents" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Contents</p>
            <ol className="mt-3 space-y-1.5 border-l-2 border-slate-200 text-sm">
              {contents.map(([id, label]) => <li key={id}><a href={`#${id}`} className="-ml-0.5 block border-l-2 border-transparent pl-3 text-slate-600 hover:border-brand-500 hover:text-brand-700">{label}</a></li>)}
            </ol>
          </nav>

          {/* 5. Guide */}
          <article className="min-w-0 max-w-3xl">
            <SectionTitle id="format">Format and length</SectionTitle>
            <p className="mt-3 text-slate-700">
              Use a reverse-chronological layout: your most recent role first. In {COUNTRY_NAMES[main.country]} the document is usually called a <b>{rules?.term.value ?? term}</b>, printed on <b>{format.paper}</b> paper, and {rules ? <>usually <b>{rules.length.value}</b></> : "kept short"}. Write dates the same way throughout (this example uses {rules?.dateFormat.example ?? format.dateFormat}).
            </p>
            {rules && <p className="mt-2 text-sm text-slate-600">{rules.length.note}</p>}

            <SectionTitle id="design">Design tips</SectionTitle>
            <List items={["Keep one column of real text for the main content; text inside images or text boxes may not be read by hiring software.", "Use standard headings such as Summary, Experience, Education and Skills, so both people and software find things quickly.", "Pick one readable font at 10–12 pt and use bold sparingly: for job titles and section headings, not whole sentences.", "Leave white space between sections. A slightly longer, readable résumé beats a cramped one.", "Save and send a PDF unless the employer asks for Word, and name the file with your name and the role."]} />

            <SectionTitle id="sections">Top sections for a {role.name.toLowerCase()} {term.toLowerCase()}</SectionTitle>
            <List items={["Header: name, job title, phone, email, LinkedIn and city.", "Summary: two or three sentences on your specialism, experience and a standout result.", "Experience: each role with dates and 3–5 bullets that show results.", "Key achievements: a few highlights a reader shouldn't miss.", "Skills, education, courses and certifications, then languages and (optionally) interests."]} />

            <SectionTitle id="recruiters">What recruiters look for</SectionTitle>
            <List items={g.recruiterFocus} />

            <SectionTitle id="experience">Writing your experience</SectionTitle>
            <List items={g.experienceTips} />

            <SectionTitle id="numbers">Showing results with numbers</SectionTitle>
            <List items={g.numbersTips} />

            <SectionTitle id="no-experience">Applying with no experience</SectionTitle>
            <List items={g.noExperience} />
            <p className="mt-3 rounded-2xl border border-slate-200 bg-surface p-4 text-slate-700"><b className="text-slate-900">Objective example: </b>{g.objectiveExample}</p>

            <SectionTitle id="hard-skills">Hard skills</SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">{g.hardSkills.map((s) => <span key={s} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{s}</span>)}</div>

            <SectionTitle id="soft-skills">Soft skills, and how to prove them</SectionTitle>
            <List items={g.softSkills.map((s) => <><b className="text-slate-900">{s.skill}:</b> {s.proof}</>)} />

            <SectionTitle id="education">Education</SectionTitle>
            <p className="mt-3 text-slate-700">{g.education}</p>
            {rules && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-surface p-4 text-sm">
                <p className="font-bold text-slate-900">Terms you&rsquo;ll see in {COUNTRY_NAMES[main.country]}</p>
                <ul className="mt-2 space-y-1 text-slate-700">{rules.education.terms.map((t) => <li key={t.term}><b>{t.term}</b>: {t.meaning}</li>)}</ul>
              </div>
            )}

            <SectionTitle id="certifications">Certifications</SectionTitle>
            <List items={g.certifications.map((c) => <><b className="text-slate-900">{c.name}:</b> {c.note}</>)} />

            <SectionTitle id="summary">Summary or objective?</SectionTitle>
            <p className="mt-3 text-slate-700">{g.summaryVsObjective}</p>
            <p className="mt-3 rounded-2xl border border-slate-200 bg-surface p-4 text-slate-700"><b className="text-slate-900">Summary example: </b>{g.summaryExample}</p>

            <SectionTitle id="extras">Extra sections worth adding</SectionTitle>
            <List items={g.extraSections} />

            <SectionTitle id="takeaways">Key takeaways</SectionTitle>
            <List items={g.takeaways} />

            {/* 6. Weak vs strong */}
            <div className="mt-12"><SectionTitle id="weak-strong">Weak vs strong examples</SectionTitle></div>
            <div className="mt-4 space-y-4">
              {g.weakStrong.map((w, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-surface">
                  <p className="flex gap-2 border-b border-slate-200 bg-[#fff4f2] p-4 text-[#9b2f29]"><XCircle className="mt-0.5 size-4 shrink-0" aria-label="Weak" /><span>{w.weak}</span></p>
                  <p className="flex gap-2 bg-[#effbf6] p-4 text-[#0b5a43]"><BadgeCheck className="mt-0.5 size-4 shrink-0" aria-label="Strong" /><span>{w.strong}</span></p>
                  <p className="p-4 text-sm text-slate-600"><b className="text-slate-800">Why it works: </b>{w.why}</p>
                </div>
              ))}
            </div>

            {/* 7. Country tips */}
            <div className="mt-12"><SectionTitle id="country-tips" sub="Rules differ by country. Where our sources disagree, we say so.">Country-specific tips</SectionTitle></div>
            <div className="mt-4 space-y-4">
              {(country ? [country] : COUNTRY_CODES).map((c) => {
                const r = rulesFor(c);
                return (
                  <div key={c} className="rounded-2xl border border-slate-200 bg-surface p-5">
                    <h3 className="font-display text-lg font-bold text-slate-900">{FLAG[c]} {COUNTRY_NAMES[c]}</h3>
                    <p className="mt-2 text-slate-700">{g.countryNotes[c]}</p>
                    {r && (
                      <ul className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <li><b>Usual term:</b> {r.term.value}</li>
                        <li><b>Paper:</b> {r.paper.value}</li>
                        <li><b>Length:</b> {r.length.value}</li>
                        <li><b>Photo:</b> {r.photo.value}</li>
                      </ul>
                    )}
                    {country && r?.disagreements.length ? (
                      <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        <p className="font-bold">Where sources disagree</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">{r.disagreements.map((d) => <li key={d}>{d}</li>)}</ul>
                      </div>
                    ) : null}
                    <Link href={`/resume-examples/country/${COUNTRY_SLUGS[c]}`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">All {COUNTRY_NAMES[c]} rules and sources <ArrowRight className="size-3.5" aria-hidden /></Link>
                  </div>
                );
              })}
            </div>

            {/* 8. Related roles */}
            <div className="mt-12"><SectionTitle id="related">Related roles</SectionTitle></div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {siblings.map((r) => <li key={r.slug}><Link href={roleHref(r)} className="inline-flex rounded-full border border-slate-200 bg-surface px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">{r.name}</Link></li>)}
              <li><Link href={`/resume-examples/${cat.slug}`} className="inline-flex rounded-full border border-slate-200 bg-surface px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">All {cat.name}</Link></li>
              <li><Link href="/resume-examples" className="inline-flex rounded-full border border-slate-200 bg-surface px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700">All categories</Link></li>
            </ul>

            {/* 9. Download */}
            <div className="mt-10 rounded-2xl border border-slate-200 bg-surface p-5">
              <p className="font-bold text-slate-900">Download the {COUNTRY_NAMES[main.country]} example</p>
              <p className="mt-1 text-sm text-slate-600">PDF, {format.paper} paper, selectable text. {NOTICE}</p>
              <a href={pdf} className="btn-primary mt-3"><Download className="size-4" aria-hidden /> Download PDF</a>
            </div>
          </article>
        </div>
      )}
      <Cta />
    </div>
  );
}
