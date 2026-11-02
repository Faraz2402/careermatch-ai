import "server-only";
// PDF for a Resume Example: selectable text, single reading order, in the country's paper size.
// Same content, order and templates as the on-screen ResumeDoc.
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { pdfSafe } from "../templates/render";
import { fmtDate, newestFirst, NOTICE, type DocFormat } from "./shared";
import type { Sample, TemplateId } from "./types";

const PAPER = { Letter: [612, 792], A4: [595.28, 841.89] } as const;
const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const ACCENT: Record<TemplateId, string> = { meridian: "#1e3a8a", horizon: "#4263ff", ledger: "#0f766e" };
const RULE: Record<TemplateId, string> = { meridian: "#c7cfe3", horizon: "#dfe5ff", ledger: "#cfe7e3" };
/** Standard PDF fonts lack ₹, so the PDF writes INR instead. */
const clean = (s: string) => pdfSafe(s.replace(/₹\s?/g, "INR "));

export async function examplePdf(s: Sample, format: DocFormat) {
  const doc = await PDFDocument.create();
  const c = s.content;
  doc.setTitle(clean(`${c.name} - ${c.title} (fictional sample)`));
  doc.setSubject(NOTICE);
  doc.setCreator("CareerMatch AI Resume Examples");
  const serif = s.template === "meridian";
  const font = await doc.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await doc.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(serif ? StandardFonts.TimesRomanItalic : StandardFonts.HelveticaOblique);
  const [W, H] = PAPER[format.paper];
  const M = 46;
  const accent = hex(ACCENT[s.template]), rule = hex(RULE[s.template]), ink = rgb(0.07, 0.09, 0.15), muted = rgb(0.3, 0.33, 0.39);
  const columns = s.template === "ledger";
  const center = s.template === "meridian";
  const X = columns ? M + 100 : M; // content column
  const CW = W - M - X;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const d = (ym?: string) => fmtDate(ym, format.dateFormat);

  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const ensure = (need: number) => {
    if (y - need < M + 14) newPage();
  };
  const wrap = (str: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const w of clean(str).split(" ")) {
      const next = line ? `${line} ${w}` : w;
      if (line && f.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const text = (str: string, o: { f?: PDFFont; size?: number; color?: RGB; x?: number; width?: number; align?: "center"; lead?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 9.6, x = o.x ?? X, width = o.width ?? CW, lead = o.lead ?? size * 1.38;
    for (const ln of wrap(str, f, size, width)) {
      ensure(lead);
      const lx = o.align === "center" ? (W - f.widthOfTextAtSize(ln, size)) / 2 : x;
      page.drawText(ln, { x: lx, y: y - size, size, font: f, color: o.color ?? ink });
      y -= lead;
    }
  };
  const bullet = (str: string) => {
    const lines = wrap(str, font, 9.6, CW - 12);
    lines.forEach((ln, i) => {
      ensure(13.2);
      if (i === 0) page.drawText("•", { x: X + 2, y: y - 9.6, size: 9.6, font, color: accent });
      page.drawText(ln, { x: X + 12, y: y - 9.6, size: 9.6, font, color: ink });
      y -= 13.2;
    });
  };
  /** Title on the left, dates right-aligned on the same line. */
  const row = (title: string, sub: string, dates: string) => {
    const size = 10;
    const dw = font.widthOfTextAtSize(clean(dates), 9);
    const head = `${title} · ${sub}`;
    const lines = wrap(head, bold, size, CW - dw - 12);
    ensure(14 * lines.length + 14);
    page.drawText(clean(dates), { x: W - M - dw, y: y - size, size: 9, font, color: muted });
    lines.forEach((ln) => {
      page.drawText(ln, { x: X, y: y - size, size, font: bold, color: ink });
      y -= 14;
    });
  };
  const section = (title: string, body: () => void) => {
    ensure(40);
    y -= columns ? 6 : 10;
    if (columns) {
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: rule });
      y -= 7;
      page.drawText(clean(title.toUpperCase()), { x: M, y: y - 8.5, size: 8, font: bold, color: accent });
    } else {
      const t = clean(title.toUpperCase());
      const size = 9.5;
      const tx = center ? (W - bold.widthOfTextAtSize(t, size)) / 2 : M;
      page.drawText(t, { x: tx, y: y - size, size, font: bold, color: accent });
      y -= size + 4;
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: center ? 0.6 : 1.4, color: rule });
      y -= 6;
    }
    body();
  };

  // Header
  if (s.template === "horizon") page.drawRectangle({ x: 0, y: H - 7, width: W, height: 7, color: accent });
  text(c.name, { f: center ? font : bold, size: 23, x: M, width: W - 2 * M, align: center ? "center" : undefined, lead: 27 });
  text(c.title, { f: center ? italic : bold, size: 11.5, color: accent, x: M, width: W - 2 * M, align: center ? "center" : undefined, lead: 16 });
  text([c.phone, c.email, c.linkedin, c.location].join("  |  "), { size: 8.8, color: muted, x: M, width: W - 2 * M, align: center ? "center" : undefined });
  y -= 2;

  section("Summary", () => text(c.summary));
  section("Experience", () =>
    newestFirst(c.experience).forEach((j, i) => {
      if (i) y -= 5;
      row(j.title, `${j.company}, ${j.location}`, `${d(j.start)} – ${d(j.end)}`);
      j.bullets.forEach(bullet);
    }),
  );
  section("Key achievements", () => c.achievements.forEach((a) => bullet(`${a.title}: ${a.detail}`)));
  section("Skills", () => text(c.skills.join(" · ")));
  section("Education", () =>
    newestFirst(c.education).forEach((e, i) => {
      if (i) y -= 3;
      row(e.degree, `${e.school}, ${e.location}`, `${e.start ? `${d(e.start)} – ` : ""}${d(e.end)}`);
      if (e.details) text(e.details, { color: muted, size: 9.2 });
    }),
  );
  if (c.courses.length) section("Courses & certifications", () => c.courses.forEach((x) => bullet(`${x.name}, ${x.provider} (${x.year})`)));
  section("Languages", () => text(c.languages.map((l) => `${l.name} (${l.level})`).join(" · ")));
  if (c.interests.length) section("Interests", () => text(c.interests.join(" · ")));

  // The fictional-sample notice on every page.
  for (const p of doc.getPages()) {
    const n = clean(NOTICE);
    p.drawText(n, { x: (W - font.widthOfTextAtSize(n, 7.5)) / 2, y: 24, size: 7.5, font: italic, color: muted });
  }
  return doc.save();
}
