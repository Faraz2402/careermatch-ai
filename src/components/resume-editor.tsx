"use client";

import type { ResumeData } from "@/lib/resume/schema";

type Props = { value: ResumeData; onChange: (v: ResumeData) => void };

function Section({ id, title, children, onAdd }: { id: string; title: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <section id={id} className="card scroll-mt-24 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {onAdd && (
          <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={onAdd}>+ Add</button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, textarea, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {textarea ? (
        <textarea className="input min-h-24" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

const Remove = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="text-xs font-medium text-rose-600 hover:underline">Remove</button>
);

export function ResumeEditor({ value: r, onChange }: Props) {
  const set = <K extends keyof ResumeData>(k: K, v: ResumeData[K]) => onChange({ ...r, [k]: v });
  const setItem = <K extends "experience" | "education" | "projects" | "certifications" | "links" | "skills">(
    k: K,
    i: number,
    patch: Partial<ResumeData[K][number]>,
  ) => set(k, r[k].map((it, j) => (j === i ? { ...it, ...patch } : it)) as ResumeData[K]);
  const removeItem = (k: "experience" | "education" | "projects" | "certifications" | "links" | "skills", i: number) =>
    set(k, r[k].filter((_, j) => j !== i) as never);

  return (
    <div className="space-y-5">
      <Section id="basics" title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={r.name} onChange={(v) => set("name", v)} />
          <Field label="Headline" value={r.headline} onChange={(v) => set("headline", v)} placeholder="e.g. Senior Product Designer" />
          <Field label="Location" value={r.location} onChange={(v) => set("location", v)} placeholder="City, Region or Remote" />
          <Field label="Email" value={r.email} onChange={(v) => set("email", v)} />
          <Field label="Phone" value={r.phone} onChange={(v) => set("phone", v)} />
        </div>
      </Section>

      <Section id="summary" title="Summary">
        <Field label="Professional summary" textarea value={r.summary} onChange={(v) => set("summary", v)} />
      </Section>

      <Section
        id="experience"
        title="Experience"
        onAdd={() => set("experience", [...r.experience, { title: "", company: "", location: "", startDate: "", endDate: "", highlights: [] }])}
      >
        {r.experience.length === 0 && <p className="text-sm text-slate-500">No roles yet.</p>}
        {r.experience.map((e, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={e.title} onChange={(v) => setItem("experience", i, { title: v })} />
              <Field label="Company" value={e.company} onChange={(v) => setItem("experience", i, { company: v })} />
              <Field label="Start" value={e.startDate} onChange={(v) => setItem("experience", i, { startDate: v })} placeholder="Mar 2021" />
              <Field label="End" value={e.endDate} onChange={(v) => setItem("experience", i, { endDate: v })} placeholder="Present" />
            </div>
            <label className="mt-3 block">
              <span className="label">Highlights (one per line)</span>
              <textarea
                className="input min-h-28"
                value={e.highlights.join("\n")}
                onChange={(ev) => setItem("experience", i, { highlights: ev.target.value.split("\n") })}
                onBlur={(ev) => setItem("experience", i, { highlights: ev.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              />
            </label>
            <div className="mt-2 text-right"><Remove onClick={() => removeItem("experience", i)} /></div>
          </div>
        ))}
      </Section>

      <Section id="skills" title="Skills" onAdd={() => set("skills", [...r.skills, { category: "Other", skills: [] }])}>
        {r.skills.map((g, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <Field label="Category" value={g.category} onChange={(v) => setItem("skills", i, { category: v })} />
            <Field
              label="Skills (comma-separated)"
              value={g.skills.join(", ")}
              onChange={(v) => setItem("skills", i, { skills: v.split(",").map((s) => s.trimStart()) })}
            />
            <div className="pb-2"><Remove onClick={() => removeItem("skills", i)} /></div>
          </div>
        ))}
      </Section>

      <Section
        id="education"
        title="Education"
        onAdd={() => set("education", [...r.education, { school: "", degree: "", field: "", startDate: "", endDate: "", details: "" }])}
      >
        {r.education.map((e, i) => (
          <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
            <Field label="School" value={e.school} onChange={(v) => setItem("education", i, { school: v })} />
            <Field label="Degree" value={e.degree} onChange={(v) => setItem("education", i, { degree: v })} />
            <Field label="Field of study" value={e.field} onChange={(v) => setItem("education", i, { field: v })} />
            <Field label="Graduation" value={e.endDate} onChange={(v) => setItem("education", i, { endDate: v })} />
            <div className="sm:col-span-2 text-right"><Remove onClick={() => removeItem("education", i)} /></div>
          </div>
        ))}
      </Section>

      <Section id="projects" title="Projects" onAdd={() => set("projects", [...r.projects, { name: "", description: "", url: "", technologies: [] }])}>
        {r.projects.map((p, i) => (
          <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
            <Field label="Name" value={p.name} onChange={(v) => setItem("projects", i, { name: v })} />
            <Field label="URL" value={p.url} onChange={(v) => setItem("projects", i, { url: v })} />
            <div className="sm:col-span-2">
              <Field label="Description" textarea value={p.description} onChange={(v) => setItem("projects", i, { description: v })} />
            </div>
            <div className="sm:col-span-2 text-right"><Remove onClick={() => removeItem("projects", i)} /></div>
          </div>
        ))}
      </Section>

      <Section id="certifications" title="Certifications" onAdd={() => set("certifications", [...r.certifications, { name: "", issuer: "", date: "" }])}>
        {r.certifications.map((c, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
            <Field label="Name" value={c.name} onChange={(v) => setItem("certifications", i, { name: v })} />
            <Field label="Issuer" value={c.issuer} onChange={(v) => setItem("certifications", i, { issuer: v })} />
            <Field label="Year" value={c.date} onChange={(v) => setItem("certifications", i, { date: v })} />
            <div className="pb-2"><Remove onClick={() => removeItem("certifications", i)} /></div>
          </div>
        ))}
      </Section>

      <Section id="links" title="Links" onAdd={() => set("links", [...r.links, { label: "", url: "" }])}>
        {r.links.map((l, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
            <Field label="Label" value={l.label} onChange={(v) => setItem("links", i, { label: v })} placeholder="LinkedIn" />
            <Field label="URL" value={l.url} onChange={(v) => setItem("links", i, { url: v })} placeholder="https://" />
            <div className="pb-2"><Remove onClick={() => removeItem("links", i)} /></div>
          </div>
        ))}
      </Section>
    </div>
  );
}

/** Tidy free-text edits (blank bullets, untrimmed skills) before saving. */
export function cleanResume(r: ResumeData): ResumeData {
  return {
    ...r,
    experience: r.experience.map((e) => ({ ...e, highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })),
    skills: r.skills.map((g) => ({ ...g, skills: g.skills.map((s) => s.trim()).filter(Boolean) })).filter((g) => g.skills.length),
    links: r.links.filter((l) => l.url.trim()),
  };
}
