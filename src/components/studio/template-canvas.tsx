"use client";

// Live HTML preview of a template, from the same DocModel as the PDF and
// Word exports. Always white paper and dark ink, whatever the site theme.

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { CoverLetter } from "@/lib/tailor/types";
import { labelsFor, letterBlocks, type DocModel, type DocSection, type Entry } from "@/lib/templates/model";

const PAGE = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 } } as const;
const DENSITY = { airy: { size: 14, gap: 16, pad: 74 }, standard: { size: 13.4, gap: 12, pad: 64 }, compact: { size: 12.4, gap: 8, pad: 52 } } as const;

const INK = "#18181b";
const MUTED = "#5b6170";

export function pageSize(paper: "A4" | "Letter") {
  return PAGE[paper];
}

function Heading({ text, accent, size }: { text: string; accent: string; size: number }) {
  return <div style={{ color: accent, fontWeight: 700, fontSize: size + 1, letterSpacing: "0.04em", textTransform: "uppercase", borderBottom: `1px solid ${accent}`, paddingBottom: 3, marginBottom: 8 }}>{text}</div>;
}

function EntryView({ e, tabular, size }: { e: Entry; tabular: boolean; size: number }) {
  const title = [e.title, e.sub].filter(Boolean).join(" — ");
  const body = (
    <>
      {e.location && <div style={{ color: MUTED, fontSize: size - 1 }}>{e.location}</div>}
      {e.text && <div>{e.text}</div>}
      {e.bullets.length > 0 && (
        <ul style={{ margin: "3px 0 0", paddingLeft: 17 }}>
          {e.bullets.map((b, i) => <li key={i} style={{ marginBottom: 2 }}>{b}</li>)}
        </ul>
      )}
    </>
  );
  if (tabular)
    return (
      <div style={{ display: "grid", gridTemplateColumns: "118px 1fr", gap: 10, marginBottom: 9 }}>
        <div style={{ color: MUTED, fontSize: size - 1 }}>{e.dates}</div>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          {body}
        </div>
      </div>
    );
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontWeight: 700 }}>{title}</span>
        {e.dates && <span style={{ color: MUTED, whiteSpace: "nowrap" }}>{e.dates}</span>}
      </div>
      {body}
    </div>
  );
}

function SectionView({ s, accent, size, gap, tabular }: { s: DocSection; accent: string; size: number; gap: number; tabular: boolean }) {
  return (
    <section style={{ marginTop: gap }}>
      <Heading text={s.heading} accent={accent} size={size} />
      {s.text && <p style={{ margin: 0 }}>{s.text}</p>}
      {s.items && <ul style={{ margin: 0, paddingLeft: 17 }}>{s.items.map((i, k) => <li key={k}>{i}</li>)}</ul>}
      {s.groups?.map((g) => <div key={g.label}><b>{g.label}:</b> {g.items.join(", ")}</div>)}
      {s.pairs?.map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
      {s.entries?.map((e, i) => <EntryView key={i} e={e} tabular={tabular} size={size} />)}
    </section>
  );
}

function Header({ d, accent, size, center, banner, pad }: { d: Pick<DocModel, "name" | "headline" | "contact">; accent: string; size: number; center: boolean; banner: boolean; pad: number }) {
  if (banner)
    return (
      <div style={{ background: accent, color: "#fff", margin: `-${pad}px -${pad}px 14px`, padding: `${pad * 0.55}px ${pad}px` }}>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{d.name}</div>
        {d.headline && <div style={{ fontSize: size + 2, opacity: 0.92 }}>{d.headline}</div>}
        {d.contact.length > 0 && <div style={{ fontSize: size - 1, opacity: 0.85, marginTop: 6 }}>{d.contact.join("  |  ")}</div>}
      </div>
    );
  return (
    <header style={{ textAlign: center ? "center" : "left", marginBottom: 6 }}>
      <div style={{ fontSize: 29, fontWeight: 700, lineHeight: 1.15, color: accent === "#111827" ? INK : accent }}>{d.name}</div>
      {d.headline && <div style={{ fontSize: size + 1.5, color: MUTED, marginTop: 2 }}>{d.headline}</div>}
      {d.contact.length > 0 && <div style={{ fontSize: size - 1, color: MUTED, marginTop: 4 }}>{d.contact.join("  |  ")}</div>}
    </header>
  );
}

function FormView({ d, accent, size }: { d: DocModel; accent: string; size: number }) {
  const labels = labelsFor(d.lang);
  const title = { ja: "履 歴 書", ko: "이 력 서", zh: "个 人 简 历" }[d.lang as "ja"] ?? "BIODATA";
  const cellL: CSSProperties = { border: `1px solid ${INK}`, padding: "5px 8px", background: "#f4f4f5", fontWeight: 700, width: 150, verticalAlign: "top", fontSize: size - 1 };
  const cellR: CSSProperties = { border: `1px solid ${INK}`, padding: "5px 8px", verticalAlign: "top" };
  const rows: [string, string][] = [["Name", d.name], ["Contact", d.contact.join("  |  ")], ...(d.sections.find((s) => s.key === "personal")?.pairs ?? [])];
  return (
    <div>
      <div style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: accent, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <table style={{ borderCollapse: "collapse", flex: 1 }}><tbody>{rows.map(([k, v]) => <tr key={k}><td style={cellL}>{k}</td><td style={cellR}>{v}</td></tr>)}</tbody></table>
        {d.template.photo !== "omit" && <div style={{ width: 113, height: 151, border: `1px dashed ${MUTED}`, display: "grid", placeItems: "center", color: MUTED, fontSize: 11 }}>{labels.photo}</div>}
      </div>
      {d.sections.filter((s) => s.key !== "personal").map((s) => (
        <table key={s.key} style={{ borderCollapse: "collapse", width: "100%", marginTop: 12 }}>
          <tbody>
            {s.entries ? (
              <>
                <tr><td colSpan={2} style={{ ...cellR, background: "#fafafa", fontWeight: 700, color: accent }}>{s.heading}</td></tr>
                {s.entries.map((e, i) => (
                  <tr key={i}><td style={{ ...cellR, width: 150, color: MUTED }}>{e.dates || "—"}</td><td style={cellR}><b>{[e.title, e.sub].filter(Boolean).join(" — ")}</b>{e.bullets.length > 0 && <ul style={{ margin: "2px 0 0", paddingLeft: 16 }}>{e.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>}</td></tr>
                ))}
              </>
            ) : (
              <tr><td style={cellL}>{s.heading}</td><td style={cellR}>{s.text ?? s.items?.join("; ") ?? s.groups?.map((g) => `${g.label}: ${g.items.join(", ")}`).join(" · ")}</td></tr>
            )}
          </tbody>
        </table>
      ))}
    </div>
  );
}

/** One continuous page with dashed page-break guides (where the PDF breaks pages). */
export function TemplateCanvas({ doc, letter, view = "resume", scale = 1, guides = true, crop = false, className }: { doc: DocModel; letter?: CoverLetter | null; view?: "resume" | "letter"; scale?: number; guides?: boolean; crop?: boolean; className?: string }) {
  const t = doc.template;
  const page = PAGE[t.paper];
  const dn = DENSITY[t.style.density];
  const accent = t.style.accent;
  const font = t.style.font === "serif" ? "Cambria, 'Times New Roman', Georgia, serif" : "Calibri, 'Segoe UI', Helvetica, Arial, sans-serif";
  const base: CSSProperties = { width: page.w, minHeight: page.h, padding: dn.pad, background: "#fff", color: INK, fontFamily: font, fontSize: dn.size, lineHeight: 1.42, boxSizing: "border-box", position: "relative" };

  let body: React.ReactNode;
  if (view === "letter") {
    const b = letter ? letterBlocks(letter) : null;
    body = (
      <>
        <Header d={doc} accent={accent} size={dn.size} center={t.style.align === "center"} banner={t.layout === "banner"} pad={dn.pad} />
        {b ? (
          <div style={{ marginTop: 18 }}>
            <p style={{ color: MUTED }}>{b.date}</p>
            <p style={{ fontWeight: 700 }}>{b.subject}</p>
            <p>{b.greeting}</p>
            {b.paragraphs.map((p, i) => <p key={i} style={{ lineHeight: 1.6 }}>{p}</p>)}
            <p style={{ marginTop: 18 }}>{b.closing}<br /><b>{b.signature}</b></p>
          </div>
        ) : (
          <p style={{ marginTop: 40, color: MUTED, textAlign: "center" }}>Your cover letter will appear here.</p>
        )}
      </>
    );
  } else if (t.layout === "form") body = <FormView d={doc} accent={accent} size={dn.size} />;
  else if (t.layout === "sidebar") {
    const sideKeys = ["skills", "languages", "personal"];
    body = (
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", margin: -dn.pad, minHeight: page.h }}>
        <aside style={{ background: `color-mix(in srgb, ${accent} 12%, white)`, padding: `${dn.pad}px 22px` }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: accent, lineHeight: 1.15 }}>{doc.name}</div>
          {doc.headline && <div style={{ color: MUTED, marginTop: 4 }}>{doc.headline}</div>}
          <div style={{ marginTop: 14, fontSize: dn.size - 1.5, display: "grid", gap: 3, wordBreak: "break-word" }}>{doc.contact.map((c) => <div key={c}>{c}</div>)}</div>
          {doc.sections.filter((s) => sideKeys.includes(s.key)).map((s) => (
            <div key={s.key} style={{ marginTop: 16, fontSize: dn.size - 1 }}>
              <div style={{ color: accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{s.heading}</div>
              {s.text && <div>{s.text}</div>}
              {s.groups?.map((g) => <div key={g.label} style={{ marginBottom: 4 }}><b>{g.label}:</b> {g.items.join(", ")}</div>)}
              {s.pairs?.map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
            </div>
          ))}
        </aside>
        <main style={{ padding: `${dn.pad - dn.gap}px ${dn.pad * 0.6}px ${dn.pad}px` }}>
          {doc.sections.filter((s) => !sideKeys.includes(s.key)).map((s) => <SectionView key={s.key} s={s} accent={accent} size={dn.size} gap={dn.gap} tabular={false} />)}
        </main>
      </div>
    );
  } else
    body = (
      <>
        <Header d={doc} accent={accent} size={dn.size} center={t.style.align === "center"} banner={t.layout === "banner"} pad={dn.pad} />
        {doc.sections.map((s) => <SectionView key={s.key} s={s} accent={accent} size={dn.size} gap={dn.gap} tabular={t.layout === "tabular"} />)}
      </>
    );

  return (
    <Scaled className={className} width={page.w} scale={scale} cropHeight={crop ? page.h : undefined}>
      <div style={base}>
        {body}
        {guides &&
          [1, 2, 3].map((n) => (
            <div key={n} aria-hidden style={{ position: "absolute", left: 0, right: 0, top: page.h * n, borderTop: "1px dashed #c4b5fd", pointerEvents: "none" }}>
              <span style={{ position: "absolute", right: 8, top: 2, fontSize: 10, color: "#8b5cf6", fontFamily: "system-ui" }}>Page {n + 1}</span>
            </div>
          ))}
      </div>
    </Scaled>
  );
}

/** Scales a fixed-width page and reserves exactly the scaled height (or crops to page 1). */
function Scaled({ width, scale, cropHeight, className, children }: { width: number; scale: number; cropHeight?: number; className?: string; children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(cropHeight ?? 0);
  useLayoutEffect(() => {
    if (cropHeight || !inner.current) return;
    const el = inner.current;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [cropHeight]);
  return (
    <div className={className} style={{ width: width * scale, height: (cropHeight ?? height) * scale, overflow: "hidden" }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
