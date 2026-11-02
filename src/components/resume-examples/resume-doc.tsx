// One résumé component for every Resume Example, filled from data. No hooks, so it renders on the
// server (pages) and in the browser (home page filters). Plain, selectable text in a single reading
// order so applicant-tracking software can read it.
import type { CSSProperties } from "react";
import { fmtDate, newestFirst, NOTICE, type DocFormat } from "@/lib/resume-examples/shared";
import type { Sample, TemplateId } from "@/lib/resume-examples/types";

export const PAGE_PX = { Letter: { w: 816, h: 1056 }, A4: { w: 794, h: 1123 } } as const;

type Theme = { font: string; accent: string; ink: string; muted: string; rule: string; layout: "center" | "left" | "columns" };
export const THEMES: Record<TemplateId, Theme & { label: string; blurb: string }> = {
  meridian: { label: "Meridian", blurb: "Classic serif, centred header", font: "Georgia, 'Times New Roman', Times, serif", accent: "#1e3a8a", ink: "#111827", muted: "#4b5563", rule: "#c7cfe3", layout: "center" },
  horizon: { label: "Horizon", blurb: "Modern sans with an accent bar", font: "'Helvetica Neue', Helvetica, Arial, sans-serif", accent: "#4263ff", ink: "#10152b", muted: "#4b5563", rule: "#dfe5ff", layout: "left" },
  ledger: { label: "Ledger", blurb: "Labelled columns, compact", font: "'Helvetica Neue', Helvetica, Arial, sans-serif", accent: "#0f766e", ink: "#111827", muted: "#4b5563", rule: "#cfe7e3", layout: "columns" },
};

export function ResumeDoc({ sample, format, className, style }: { sample: Sample; format: DocFormat; className?: string; style?: CSSProperties }) {
  const t = THEMES[sample.template];
  const c = sample.content;
  const page = PAGE_PX[format.paper];
  const d = (ym?: string) => fmtDate(ym, format.dateFormat);
  const columns = t.layout === "columns";
  const center = t.layout === "center";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) =>
    columns ? (
      <section style={{ display: "grid", gridTemplateColumns: "128px 1fr", gap: 18, padding: "10px 0", borderTop: `1px solid ${t.rule}` }}>
        <h2 style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: t.accent, lineHeight: 1.5 }}>{title}</h2>
        <div>{children}</div>
      </section>
    ) : (
      <section style={{ marginTop: 14 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: center ? 12 : 11.5, fontWeight: 700, letterSpacing: center ? "0.18em" : "0.12em", textTransform: "uppercase", color: t.accent, paddingBottom: 3, borderBottom: `${center ? 1 : 2}px solid ${t.rule}`, textAlign: center ? "center" : "left" }}>{title}</h2>
        {children}
      </section>
    );

  const contact = [c.phone, c.email, c.linkedin, c.location];
  return (
    <article
      className={className}
      lang="en"
      style={{ width: page.w, minHeight: page.h, boxSizing: "border-box", background: "#fff", color: t.ink, fontFamily: t.font, fontSize: 12, lineHeight: 1.45, padding: columns ? "44px 52px 36px" : "48px 56px 36px", position: "relative", textAlign: "left", ...style }}
    >
      {t.layout === "left" && <div aria-hidden style={{ position: "absolute", inset: "0 0 auto 0", height: 9, background: `linear-gradient(90deg, ${t.accent}, #8457ff)` }} />}
      <header style={{ textAlign: center ? "center" : "left", ...(columns && { display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end", paddingBottom: 12 }) }}>
        <div>
          <h1 style={{ margin: 0, fontSize: center ? 30 : 31, fontWeight: center ? 400 : 700, letterSpacing: center ? "0.02em" : "-0.01em", lineHeight: 1.1 }}>{c.name}</h1>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: t.accent, fontStyle: center ? "italic" : "normal", fontWeight: center ? 400 : 600 }}>{c.title}</p>
        </div>
        <p style={{ margin: columns ? 0 : "8px 0 0", fontSize: 11, color: t.muted, ...(columns ? { textAlign: "right", lineHeight: 1.55 } : {}) }}>
          {columns ? contact.map((x) => <span key={x} style={{ display: "block" }}>{x}</span>) : contact.join("  ·  ")}
        </p>
      </header>

      <Section title="Summary"><p style={{ margin: 0 }}>{c.summary}</p></Section>

      <Section title="Experience">
        {newestFirst(c.experience).map((j, i) => (
          <div key={i} style={{ marginTop: i ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{j.title}<span style={{ fontWeight: 400, color: t.muted }}> · {j.company}, {j.location}</span></h3>
              <span style={{ fontSize: 11, color: t.muted, whiteSpace: "nowrap" }}>{d(j.start)} – {d(j.end)}</span>
            </div>
            <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
              {j.bullets.map((b, k) => <li key={k} style={{ marginTop: 2 }}>{b}</li>)}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Key achievements">
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {c.achievements.map((a, i) => <li key={i} style={{ marginTop: i ? 2 : 0 }}><b>{a.title}:</b> {a.detail}</li>)}
        </ul>
      </Section>

      <Section title="Skills"><p style={{ margin: 0 }}>{c.skills.join(" · ")}</p></Section>

      <Section title="Education">
        {newestFirst(c.education).map((e, i) => (
          <div key={i} style={{ marginTop: i ? 6 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <h3 style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{e.degree}<span style={{ fontWeight: 400, color: t.muted }}> · {e.school}, {e.location}</span></h3>
              <span style={{ fontSize: 11, color: t.muted, whiteSpace: "nowrap" }}>{e.start ? `${d(e.start)} – ` : ""}{d(e.end)}</span>
            </div>
            {e.details && <p style={{ margin: "2px 0 0", color: t.muted }}>{e.details}</p>}
          </div>
        ))}
      </Section>

      {c.courses.length > 0 && (
        <Section title="Courses & certifications">
          <ul style={{ margin: 0, paddingLeft: 16 }}>{c.courses.map((x, i) => <li key={i}>{x.name}, {x.provider} ({x.year})</li>)}</ul>
        </Section>
      )}

      <Section title="Languages"><p style={{ margin: 0 }}>{c.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}</p></Section>
      {c.interests.length > 0 && <Section title="Interests"><p style={{ margin: 0 }}>{c.interests.join(" · ")}</p></Section>}

      <p style={{ margin: "18px 0 0", paddingTop: 8, borderTop: `1px dashed ${t.rule}`, fontSize: 10, color: t.muted, textAlign: "center" }}>{NOTICE}</p>
    </article>
  );
}
