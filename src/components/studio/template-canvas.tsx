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

type HeadingStyle = NonNullable<DocModel["template"]["style"]["heading"]>;

function Heading({ text, accent, size, variant = "rule" }: { text: string; accent: string; size: number; variant?: HeadingStyle }) {
  const caps: CSSProperties = { fontWeight: 700, fontSize: size + 1, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 };
  if (variant === "pill")
    return <div style={{ ...caps, display: "inline-block", background: accent, color: "#fff", borderRadius: 4, padding: "2px 10px", fontSize: size }}>{text}</div>;
  if (variant === "bar") return <div style={{ ...caps, color: accent, borderLeft: `4px solid ${accent}`, paddingLeft: 8, lineHeight: 1.2 }}>{text}</div>;
  if (variant === "caps" || variant === "border") return <div style={{ ...caps, color: accent, letterSpacing: "0.16em", fontSize: size }}>{text}</div>;
  if (variant === "editorial") return <div style={{ ...caps, color: INK, borderTop: `3px solid ${accent}`, paddingTop: 6, letterSpacing: "0.08em" }}>{text}</div>;
  return <div style={{ ...caps, color: accent, borderBottom: `1px solid ${accent}`, paddingBottom: 3 }}>{text}</div>;
}

/** Round photo, or a neutral silhouette placeholder when the person hasn't added one. */
function PhotoCircle({ src, size, accent, ring = "#fff" }: { src?: string; size: number; accent: string; ring?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: `3px solid ${ring}`, boxShadow: `0 0 0 2px ${accent}`, background: `color-mix(in srgb, ${accent} 14%, white)` }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label="Photo placeholder">
          <circle cx="50" cy="40" r="18" fill={accent} opacity="0.35" />
          <path d="M18 92c4-20 18-30 32-30s28 10 32 30" fill={accent} opacity="0.35" />
        </svg>
      )}
    </div>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

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

function SectionView({ s, accent, size, gap, tabular, heading }: { s: DocSection; accent: string; size: number; gap: number; tabular: boolean; heading?: HeadingStyle }) {
  return (
    <section style={{ marginTop: gap, ...(heading === "border" && { borderLeft: `3px solid ${accent}`, paddingLeft: 14 }) }}>
      <div><Heading text={s.heading} accent={accent} size={size} variant={heading} /></div>
      {s.text && <p style={{ margin: 0 }}>{s.text}</p>}
      {s.items && <ul style={{ margin: 0, paddingLeft: 17 }}>{s.items.map((i, k) => <li key={k}>{i}</li>)}</ul>}
      {s.groups?.map((g) => <div key={g.label}><b>{g.label}:</b> {g.items.join(", ")}</div>)}
      {s.pairs?.map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
      {s.entries?.map((e, i) => <EntryView key={i} e={e} tabular={tabular} size={size} />)}
    </section>
  );
}

function Header({ d, accent, size, center, banner, pad, variant = "plain" }: { d: Pick<DocModel, "name" | "headline" | "contact" | "photo">; accent: string; size: number; center: boolean; banner: boolean; pad: number; variant?: "plain" | "monogram" | "split" | "photo" }) {
  if (variant === "photo" && !banner)
    return (
      <header style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 10 }}>
        <PhotoCircle src={d.photo} size={96} accent={accent} />
        <div>
          <div style={{ fontSize: 29, fontWeight: 700, lineHeight: 1.15, color: INK }}>{d.name}</div>
          {d.headline && <div style={{ fontSize: size + 1.5, color: accent, marginTop: 3, fontWeight: 600 }}>{d.headline}</div>}
          {d.contact.length > 0 && <div style={{ fontSize: size - 1, color: MUTED, marginTop: 5 }}>{d.contact.join("  |  ")}</div>}
        </div>
      </header>
    );
  if (variant === "monogram" && !banner)
    return (
      <header style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 8 }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: accent, color: "#fff", display: "grid", placeItems: "center", fontSize: 24, fontWeight: 700, flexShrink: 0 }}>{initials(d.name)}</div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, color: INK }}>{d.name}</div>
          {d.headline && <div style={{ fontSize: size + 1.5, color: accent, marginTop: 2, fontWeight: 600 }}>{d.headline}</div>}
          {d.contact.length > 0 && <div style={{ fontSize: size - 1, color: MUTED, marginTop: 4 }}>{d.contact.join("  |  ")}</div>}
        </div>
      </header>
    );
  if (variant === "split" && !banner)
    return (
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, borderBottom: `3px solid ${accent}`, paddingBottom: 10, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, color: INK, letterSpacing: "-0.01em" }}>{d.name}</div>
          {d.headline && <div style={{ fontSize: size + 2, color: accent, marginTop: 4, fontWeight: 600 }}>{d.headline}</div>}
        </div>
        <div style={{ textAlign: "right", fontSize: size - 1, color: MUTED, display: "grid", gap: 1 }}>{d.contact.map((c) => <div key={c}>{c}</div>)}</div>
      </header>
    );
  if (banner)
    return (
      <div style={{ background: accent, color: "#fff", margin: `-${pad}px -${pad}px 14px`, padding: `${pad * 0.55}px ${pad}px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{d.name}</div>
          {d.headline && <div style={{ fontSize: size + 2, opacity: 0.92 }}>{d.headline}</div>}
          {d.contact.length > 0 && <div style={{ fontSize: size - 1, opacity: 0.85, marginTop: 6 }}>{d.contact.join("  |  ")}</div>}
        </div>
        {variant === "photo" && <PhotoCircle src={d.photo} size={92} accent="#ffffff" ring={accent} />}
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
        {d.template.photo !== "omit" &&
          (d.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo} alt="" style={{ width: 113, height: 151, objectFit: "cover", border: `1px solid ${INK}`, display: "block" }} />
          ) : (
            <div style={{ width: 113, height: 151, border: `1px dashed ${MUTED}`, display: "grid", placeItems: "center", color: MUTED, fontSize: 11 }}>{labels.photo}</div>
          ))}
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
        <Header d={doc} accent={accent} size={dn.size} center={t.style.align === "center"} banner={t.layout === "banner"} pad={dn.pad} variant={t.style.header} />
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
    const dark = t.style.sidebar === "dark";
    const right = t.style.sidebarSide === "right";
    body = (
      <div style={{ display: "grid", gridTemplateColumns: right ? "1fr 240px" : "240px 1fr", margin: -dn.pad, minHeight: page.h }}>
        <aside style={{ order: right ? 2 : 0, background: dark ? accent : `color-mix(in srgb, ${accent} 12%, white)`, color: dark ? "#fff" : INK, padding: `${dn.pad}px 22px` }}>
          {t.style.header === "photo" && <div style={{ marginBottom: 14 }}><PhotoCircle src={doc.photo} size={110} accent={dark ? "#ffffff" : accent} ring={dark ? accent : "#fff"} /></div>}
          {dark && t.style.header !== "photo" && <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.16)", border: "2px solid rgba(255,255,255,0.5)", display: "grid", placeItems: "center", fontSize: 21, fontWeight: 700, marginBottom: 12 }}>{initials(doc.name)}</div>}
          <div style={{ fontSize: 24, fontWeight: 700, color: dark ? "#fff" : accent, lineHeight: 1.15 }}>{doc.name}</div>
          {doc.headline && <div style={{ color: dark ? "rgba(255,255,255,0.85)" : MUTED, marginTop: 4 }}>{doc.headline}</div>}
          <div style={{ marginTop: 14, fontSize: dn.size - 1.5, display: "grid", gap: 3, wordBreak: "break-word" }}>{doc.contact.map((c) => <div key={c}>{c}</div>)}</div>
          {doc.sections.filter((s) => sideKeys.includes(s.key)).map((s) => (
            <div key={s.key} style={{ marginTop: 16, fontSize: dn.size - 1 }}>
              <div style={{ color: dark ? "#fff" : accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, borderBottom: dark ? "1px solid rgba(255,255,255,0.35)" : undefined, paddingBottom: dark ? 3 : 0 }}>{s.heading}</div>
              {s.text && <div>{s.text}</div>}
              {s.groups?.map((g) => <div key={g.label} style={{ marginBottom: 4 }}><b>{g.label}:</b> {g.items.join(", ")}</div>)}
              {s.pairs?.map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
            </div>
          ))}
        </aside>
        <main style={{ order: right ? 1 : 0, padding: `${dn.pad - dn.gap}px ${dn.pad * 0.6}px ${dn.pad}px` }}>
          {doc.sections.filter((s) => !sideKeys.includes(s.key)).map((s) => <SectionView key={s.key} s={s} accent={accent} size={dn.size} gap={dn.gap} tabular={false} heading={t.style.heading} />)}
        </main>
      </div>
    );
  } else
    body = (
      <>
        <Header d={doc} accent={accent} size={dn.size} center={t.style.align === "center"} banner={t.layout === "banner"} pad={dn.pad} variant={t.style.header} />
        {doc.sections.map((s) => <SectionView key={s.key} s={s} accent={accent} size={dn.size} gap={dn.gap} tabular={t.layout === "tabular"} heading={t.style.heading} />)}
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
