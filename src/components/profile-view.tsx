import type { ResumeData, Visibility } from "@/lib/resume/schema";

export const THEME_STYLES = {
  aurora: {
    label: "Aurora",
    hero: "bg-gradient-to-br from-[#4338ca] via-[#4f46e5] to-[#6d28d9] text-white",
    sub: "text-white/80",
    avatar: "bg-white/15 ring-white/30",
    cta: "bg-surface text-[#4338ca] hover:bg-indigo-50",
    chip: "bg-brand-50 text-brand-700",
    dot: "bg-brand-500 ring-brand-100",
    line: "border-brand-100",
  },
  minimal: {
    label: "Minimal",
    hero: "border-b border-slate-200 bg-surface text-slate-900",
    sub: "text-slate-600",
    avatar: "bg-[#0f172a] text-white ring-slate-200",
    cta: "bg-[#0f172a] text-white hover:bg-[#334155]",
    chip: "bg-slate-100 text-slate-800",
    dot: "bg-slate-800 ring-slate-200",
    line: "border-slate-200",
  },
  sunset: {
    label: "Sunset",
    hero: "bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600 text-white",
    sub: "text-orange-50",
    avatar: "bg-white/20 ring-white/40",
    cta: "bg-surface text-[#e11d48] hover:bg-[#fff1f2]",
    chip: "bg-rose-50 text-rose-700",
    dot: "bg-rose-500 ring-rose-100",
    line: "border-rose-100",
  },
} as const;
export type ProfileTheme = keyof typeof THEME_STYLES;

const safeUrl = (u: string) => {
  const url = /^https?:\/\//i.test(u) ? u : `https://${u}`;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export function ProfileView({ data: r, visibility: v, preview, theme = "aurora", downloadHref }: { data: ResumeData; visibility: Visibility; preview?: boolean; theme?: ProfileTheme; downloadHref?: string }) {
  const t = THEME_STYLES[theme] ?? THEME_STYLES.aurora;
  const contactHref = v.showEmail && r.email ? `mailto:${r.email}` : r.links.map((l) => safeUrl(l.url)).find(Boolean) ?? null;
  return (
    <div className="bg-surface">
      <section className={`relative overflow-hidden px-6 py-14 sm:px-10 ${t.hero}`}>
        {theme !== "minimal" && <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl" />}
        <div className="relative mx-auto flex max-w-4xl flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className={`grid size-24 shrink-0 place-items-center rounded-2xl font-display text-3xl font-extrabold ring-1 ${t.avatar}`}>{initials(r.name)}</div>
          <div className="flex-1">
            <h1 className="font-serif text-5xl font-normal sm:text-6xl">{r.name || "Your name"}</h1>
            <p className={`mt-1 text-lg ${t.sub}`}>{r.headline}</p>
            <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm ${t.sub}`}>
              {v.showLocation && r.location && <span>📍 {r.location}</span>}
              {v.showEmail && r.email && <span>✉️ {r.email}</span>}
              {v.showPhone && r.phone && <span>📞 {r.phone}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {contactHref && (
              <a href={preview ? undefined : contactHref} className={`btn ${t.cta}`} target="_blank" rel="noopener noreferrer">
                Get in touch
              </a>
            )}
            {downloadHref && (
              <a href={preview ? undefined : downloadHref} className={`btn border ${theme === "minimal" ? "border-slate-300 text-slate-800 hover:bg-slate-50" : "border-white/50 text-white hover:bg-white/10"}`}>
                ⬇ Resume PDF
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-6 py-12 sm:px-10">
        {r.summary && (
          <section>
            <h2 className="font-display text-xl font-bold">About</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{r.summary}</p>
          </section>
        )}

        {v.showExperience && r.experience.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold">Experience</h2>
            <ol className={`mt-5 space-y-8 border-l-2 pl-6 ${t.line}`}>
              {r.experience.map((e, i) => (
                <li key={i} className="relative">
                  <span className={`absolute top-1.5 -left-[31px] size-3.5 rounded-full border-2 border-white ring-2 ${t.dot}`} />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{e.title}{e.company && <span className="font-normal text-slate-600"> · {e.company}</span>}</h3>
                    <span className="text-xs font-medium text-slate-500">{[e.startDate, e.endDate].filter(Boolean).join(" – ")}</span>
                  </div>
                  {e.highlights.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {e.highlights.map((h, j) => <li key={j}>{h}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {v.showSkills && r.skills.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold">Skills</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {r.skills.map((g) => (
                <div key={g.category} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{g.category}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.skills.map((s) => <span key={s} className={`chip ${t.chip}`}>{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {v.showProjects && r.projects.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold">Projects</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {r.projects.map((p, i) => {
                const url = p.url ? safeUrl(p.url) : null;
                return (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-semibold">{url ? <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-brand-600">{p.name} ↗</a> : p.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{p.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid gap-12 sm:grid-cols-2">
          {v.showEducation && r.education.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold">Education</h2>
              <ul className="mt-4 space-y-3">
                {r.education.map((e, i) => (
                  <li key={i}>
                    <p className="font-semibold">{e.school}</p>
                    <p className="text-sm text-slate-600">{[e.degree, e.field].filter(Boolean).join(", ")}{e.endDate && ` · ${e.endDate}`}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {v.showCertifications && r.certifications.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-bold">Certifications</h2>
              <ul className="mt-4 space-y-3">
                {r.certifications.map((c, i) => (
                  <li key={i}>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-600">{[c.issuer, c.date].filter(Boolean).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {v.showLinks && r.links.length > 0 && (
          <section className="flex flex-wrap gap-2 border-t border-slate-100 pt-8">
            {r.links.map((l, i) => {
              const url = safeUrl(l.url);
              return url ? (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary text-xs">{l.label || url} ↗</a>
              ) : null;
            })}
          </section>
        )}
      </div>
    </div>
  );
}
