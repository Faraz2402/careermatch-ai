import "server-only";
// PDF (pdf-lib, selectable text) and DOCX (docx, editable text) renderers for
// every template layout. Both read the same DocModel as the live preview.

import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TabStopType, TextRun, WidthType } from "docx";
import { appendBezierCurve, clip, closePath, endPath, moveTo, PDFDocument, popGraphicsState, pushGraphicsState, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { CoverLetter } from "../tailor/types";
import type { TemplateDef } from "./catalog";
import { labelsFor, letterBlocks, NON_LATIN, type DocModel, type DocSection, type Entry } from "./model";

const PAPER = { A4: [595.28, 841.89], Letter: [612, 792] } as const;
const DENSITY = { airy: { size: 10.5, gap: 10, margin: 58 }, standard: { size: 10.2, gap: 8, margin: 50 }, compact: { size: 9.4, gap: 5, margin: 40 } } as const;

const hexRgb = (hex: string): RGB => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const tint = (hex: string, amount: number) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return rgb(...(c.map((v) => (v + (255 - v) * amount) / 255) as [number, number, number]));
};

// Standard PDF fonts cover WinAnsi only: other Latin letters lose their accents.
const WINANSI_EXTRA = new Set("•–—‘’“”…€™‚„†‡ˆ‰Š‹ŒŽ˜šœžŸ");
const SPECIAL: Record<string, string> = { ł: "l", Ł: "L", ı: "i", İ: "I", đ: "d", Đ: "D", ø: "ø", "→": "->", "✓": "v" };
export function pdfSafe(s: string) {
  return [...s.replace(/\s+/g, " ")]
    .map((ch) => {
      if (ch.charCodeAt(0) <= 255 || WINANSI_EXTRA.has(ch)) return ch;
      if (SPECIAL[ch]) return SPECIAL[ch];
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return base.charCodeAt(0) <= 255 ? base : "";
    })
    .join("")
    .trim();
}
/** Characters a PDF will drop (shown as a pre-export warning). */
export const pdfDrops = (s: string) => s.length > 0 && pdfSafe(s).replace(/\s/g, "").length < s.replace(/\s/g, "").length * 0.9;

// --- PDF ---------------------------------------------------------------------

class Pdf {
  page!: PDFPage;
  y = 0;
  photo?: PDFImage;
  constructor(public doc: PDFDocument, public t: TemplateDef, public font: PDFFont, public bold: PDFFont, public x: number, public w: number) {}
  get W() { return PAPER[this.t.paper][0]; }
  get H() { return PAPER[this.t.paper][1]; }
  get M() { return DENSITY[this.t.style.density].margin; }
  get size() { return DENSITY[this.t.style.density].size; }
  get gap() { return DENSITY[this.t.style.density].gap; }
  onNewPage?: () => void;
  newPage() {
    this.page = this.doc.addPage([this.W, this.H]);
    this.y = this.H - this.M;
    this.onNewPage?.();
  }
  ensure(h: number) {
    if (this.y - h < this.M) this.newPage();
  }
  wrap(text: string, f: PDFFont, size: number, width: number) {
    const out: string[] = [];
    let line = "";
    for (const word of pdfSafe(text).split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  }
  text(s: string, o: { f?: PDFFont; size?: number; color?: RGB; dx?: number; width?: number; center?: boolean; lead?: number } = {}) {
    const f = o.f ?? this.font, size = o.size ?? this.size, lead = o.lead ?? size * 1.32, dx = o.dx ?? 0, width = o.width ?? this.w - dx;
    for (const line of this.wrap(s, f, size, width)) {
      this.ensure(lead);
      const x = o.center ? this.x + (this.w - f.widthOfTextAtSize(line, size)) / 2 : this.x + dx;
      this.page.drawText(line, { x, y: this.y - size, size, font: f, color: o.color ?? rgb(0.1, 0.1, 0.12) });
      this.y -= lead;
    }
  }
  rightText(s: string, color: RGB) {
    const t = pdfSafe(s);
    this.page.drawText(t, { x: this.x + this.w - this.font.widthOfTextAtSize(t, this.size), y: this.y - this.size, size: this.size, font: this.font, color });
  }
}

const ink = rgb(0.1, 0.1, 0.12);
const muted = rgb(0.38, 0.4, 0.45);

const white = rgb(1, 1, 1);
const initialsOf = (name: string) => pdfSafe(name).split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/** JPEG bytes from the data URL a photo design carries. Copied out of Node's shared buffer pool:
    pdf-lib reads from the start of the underlying ArrayBuffer and would otherwise miss the JPEG header. */
const photoBytes = (dataUrl?: string) => (dataUrl?.startsWith("data:image/jpeg;base64,") ? new Uint8Array(Buffer.from(dataUrl.slice(23), "base64")) : null);

/** Round photo (clipped to a circle) or, without one, an initials badge. */
function photoCircle(p: Pdf, cx: number, cy: number, r: number, accent: RGB, name: string) {
  if (p.photo) {
    const k = 0.5523 * r;
    p.page.pushOperators(
      pushGraphicsState(),
      moveTo(cx + r, cy),
      appendBezierCurve(cx + r, cy + k, cx + k, cy + r, cx, cy + r),
      appendBezierCurve(cx - k, cy + r, cx - r, cy + k, cx - r, cy),
      appendBezierCurve(cx - r, cy - k, cx - k, cy - r, cx, cy - r),
      appendBezierCurve(cx + k, cy - r, cx + r, cy - k, cx + r, cy),
      closePath(),
      clip(),
      endPath(),
    );
    p.page.drawImage(p.photo, { x: cx - r, y: cy - r, width: r * 2, height: r * 2 });
    p.page.pushOperators(popGraphicsState());
    p.page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, borderColor: accent, borderWidth: 1.5 });
    return;
  }
  p.page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, color: accent });
  const ini = initialsOf(name);
  const size = r * 0.7;
  p.page.drawText(ini, { x: cx - p.bold.widthOfTextAtSize(ini, size) / 2, y: cy - size / 3, size, font: p.bold, color: white });
}

function heading(p: Pdf, text: string, accent: RGB) {
  const variant = p.t.style.heading ?? "rule";
  const label = pdfSafe(text.toUpperCase());
  const size = p.size + 0.6;
  p.y -= p.gap;
  p.ensure(p.size * 3.2);
  if (variant === "pill") {
    const w = p.bold.widthOfTextAtSize(label, size - 0.6) + 14;
    p.page.drawRectangle({ x: p.x, y: p.y - size - 3, width: w, height: size + 6, color: accent });
    p.page.drawText(label, { x: p.x + 7, y: p.y - size + 0.5, size: size - 0.6, font: p.bold, color: white });
    p.y -= size + 9;
  } else if (variant === "bar") {
    p.page.drawRectangle({ x: p.x, y: p.y - size - 1, width: 3, height: size + 3, color: accent });
    p.page.drawText(label, { x: p.x + 9, y: p.y - size, size, font: p.bold, color: accent });
    p.y -= size * 1.5;
  } else if (variant === "editorial") {
    p.page.drawRectangle({ x: p.x, y: p.y - 3, width: p.w, height: 2.4, color: accent });
    p.y -= 8;
    p.text(label, { f: p.bold, size, color: ink });
  } else {
    p.text(label, { f: p.bold, size: variant === "caps" || variant === "border" ? p.size : size, color: accent });
    if (variant === "rule") p.page.drawLine({ start: { x: p.x, y: p.y + 2 }, end: { x: p.x + p.w, y: p.y + 2 }, thickness: 0.6, color: accent });
  }
  p.y -= p.gap / 2;
}

function bullets(p: Pdf, items: string[], dx = 0) {
  for (const b of items) {
    const lines = p.wrap(b, p.font, p.size, p.w - dx - 11);
    lines.forEach((line, i) => {
      p.ensure(p.size * 1.32);
      if (i === 0) p.page.drawText("•", { x: p.x + dx + 1, y: p.y - p.size, size: p.size, font: p.font, color: ink });
      p.page.drawText(line, { x: p.x + dx + 11, y: p.y - p.size, size: p.size, font: p.font, color: ink });
      p.y -= p.size * 1.32;
    });
  }
}

function entry(p: Pdf, e: Entry, tabular: boolean) {
  const DATE_COL = 92;
  p.ensure(p.size * 3);
  if (tabular) {
    const top = p.y;
    p.page.drawText(pdfSafe(e.dates), { x: p.x, y: p.y - p.size, size: p.size - 0.6, font: p.font, color: muted });
    p.text([e.title, e.sub].filter(Boolean).join(" — "), { f: p.bold, dx: DATE_COL });
    if (e.location) p.text(e.location, { dx: DATE_COL, color: muted, size: p.size - 0.6 });
    if (e.text) p.text(e.text, { dx: DATE_COL });
    bullets(p, e.bullets, DATE_COL);
    if (p.y > top - p.size * 1.4) p.y = top - p.size * 1.4;
  } else {
    p.ensure(p.size * 2.6);
    if (e.dates) p.rightText(e.dates, muted);
    const left = [e.title, e.sub].filter(Boolean).join(" — ");
    p.text(left, { f: p.bold, width: p.w - (e.dates ? p.font.widthOfTextAtSize(pdfSafe(e.dates), p.size) + 14 : 0) });
    if (e.location) p.text(e.location, { color: muted, size: p.size - 0.6 });
    if (e.text) p.text(e.text);
    bullets(p, e.bullets);
  }
  p.y -= p.gap / 2;
}

function section(p: Pdf, s: DocSection, accent: RGB, tabular: boolean) {
  const border = p.t.style.heading === "border";
  const x0 = p.x, w0 = p.w;
  if (border) {
    p.x = x0 + 12;
    p.w = w0 - 12;
  }
  p.y -= p.gap;
  const startPage = p.page, startY = p.y;
  p.y += p.gap;
  heading(p, s.heading, accent);
  if (s.text) p.text(s.text);
  if (s.items) bullets(p, s.items);
  if (s.groups) for (const g of s.groups) p.text(`${g.label}: ${g.items.join(", ")}`);
  if (s.pairs) for (const [k, v] of s.pairs) p.text(`${k}: ${v}`);
  for (const e of s.entries ?? []) entry(p, e, tabular);
  if (border) {
    // Accent line down the section (on the page where it ends, from the top if it spilled over).
    const top = p.page === startPage ? startY : p.H - p.M;
    p.page.drawRectangle({ x: x0, y: p.y + 2, width: 2.4, height: Math.max(0, top - p.y - 2), color: accent });
    p.x = x0;
    p.w = w0;
  }
}

async function pdfBase(t: TemplateDef) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(t.style.font === "serif" ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await doc.embedFont(t.style.font === "serif" ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  const M = DENSITY[t.style.density].margin;
  const p = new Pdf(doc, t, font, bold, M, PAPER[t.paper][0] - 2 * M);
  return { doc, p };
}

function pdfHeader(p: Pdf, d: { name: string; headline: string; contact: string[] }, accent: RGB, banner: boolean) {
  const center = p.t.style.align === "center";
  if (banner) {
    const h = 86;
    p.page.drawRectangle({ x: 0, y: p.H - h, width: p.W, height: h, color: accent });
    if (p.t.style.header === "photo") photoCircle(p, p.W - p.M - 32, p.H - h / 2, 32, white, d.name);
    p.page.drawText(pdfSafe(d.name), { x: p.M, y: p.H - 44, size: 22, font: p.bold, color: rgb(1, 1, 1) });
    if (d.headline) p.page.drawText(pdfSafe(d.headline), { x: p.M, y: p.H - 62, size: 11, font: p.font, color: rgb(1, 1, 1) });
    p.y = p.H - h - 14;
    p.text(d.contact.join("  |  "), { size: p.size - 0.6, color: muted });
    return;
  }
  const variant = p.t.style.header ?? "plain";
  if (variant === "photo") {
    const r = 34;
    const top = p.y;
    photoCircle(p, p.x + r, top - r, r, accent, d.name);
    const x0 = p.x, w0 = p.w;
    p.x = x0 + r * 2 + 16;
    p.w = w0 - r * 2 - 16;
    p.y = top - 6;
    p.text(d.name, { f: p.bold, size: 20, color: ink, lead: 23 });
    if (d.headline) p.text(d.headline, { f: p.bold, size: p.size + 0.6, color: accent });
    if (d.contact.length) p.text(d.contact.join("  |  "), { size: p.size - 0.6, color: muted });
    p.x = x0;
    p.w = w0;
    p.y = Math.min(p.y, top - r * 2 - 6) - p.gap / 2;
    return;
  }
  if (variant === "monogram") {
    const r = 24;
    const top = p.y;
    p.page.drawEllipse({ x: p.x + r, y: top - r, xScale: r, yScale: r, color: accent });
    const ini = initialsOf(d.name);
    p.page.drawText(ini, { x: p.x + r - p.bold.widthOfTextAtSize(ini, 17) / 2, y: top - r - 6, size: 17, font: p.bold, color: white });
    const x0 = p.x, w0 = p.w;
    p.x = x0 + r * 2 + 14;
    p.w = w0 - r * 2 - 14;
    p.text(d.name, { f: p.bold, size: 20, color: ink, lead: 23 });
    if (d.headline) p.text(d.headline, { f: p.bold, size: p.size + 0.6, color: accent });
    if (d.contact.length) p.text(d.contact.join("  |  "), { size: p.size - 0.6, color: muted });
    p.x = x0;
    p.w = w0;
    p.y = Math.min(p.y, top - r * 2 - 4) - p.gap / 2;
    return;
  }
  if (variant === "split") {
    const top = p.y;
    const colW = p.w * 0.42;
    let ry = top;
    for (const c of d.contact) {
      const t = pdfSafe(c);
      const size = p.size - 0.8;
      p.page.drawText(t, { x: p.x + p.w - p.font.widthOfTextAtSize(t, size), y: ry - size, size, font: p.font, color: muted });
      ry -= size * 1.3;
    }
    p.text(d.name, { f: p.bold, size: 22, color: ink, lead: 25, width: p.w - colW });
    if (d.headline) p.text(d.headline, { f: p.bold, size: p.size + 1, color: accent, width: p.w - colW });
    p.y = Math.min(p.y, ry) - 4;
    p.page.drawRectangle({ x: p.x, y: p.y, width: p.w, height: 2, color: accent });
    p.y -= p.gap;
    return;
  }
  p.text(d.name, { f: p.bold, size: 21, center, color: p.t.style.accent === "#111827" ? ink : accent, lead: 25 });
  if (d.headline) p.text(d.headline, { size: p.size + 1, center, color: muted });
  if (d.contact.length) p.text(d.contact.join("  |  "), { size: p.size - 0.6, center, color: muted });
  p.y -= p.gap / 2;
}

function pdfForm(p: Pdf, d: DocModel, accent: RGB) {
  const labels = labelsFor(d.lang, { pdf: true });
  const title = { ja: "RIREKISHO (Resume)", ko: "IRYEOKSEO (Resume)", zh: "RESUME" }[d.lang as "ja"] ?? "BIODATA";
  p.text(title, { f: p.bold, size: 16, center: true, color: accent, lead: 26 });
  const photo = d.template.photo !== "omit";
  const boxW = photo ? p.w - 96 : p.w;
  const top = p.y;
  const row = (label: string, value: string, w = boxW) => {
    const h = Math.max(22, p.wrap(value, p.font, p.size, w - 112).length * p.size * 1.3 + 8);
    p.ensure(h);
    p.page.drawRectangle({ x: p.x, y: p.y - h, width: w, height: h, borderColor: ink, borderWidth: 0.5 });
    p.page.drawLine({ start: { x: p.x + 104, y: p.y }, end: { x: p.x + 104, y: p.y - h }, thickness: 0.5, color: ink });
    p.page.drawText(pdfSafe(label), { x: p.x + 5, y: p.y - 14, size: p.size - 0.8, font: p.bold, color: muted });
    let y = p.y - 14;
    for (const line of p.wrap(value, p.font, p.size, w - 112)) {
      p.page.drawText(line, { x: p.x + 110, y, size: p.size, font: p.font, color: ink });
      y -= p.size * 1.3;
    }
    p.y -= h;
  };
  row("Name", d.name);
  if (d.contact.length) row("Contact", d.contact.join("  |  "));
  for (const [k, v] of d.sections.find((s) => s.key === "personal")?.pairs ?? []) row(k, v);
  if (photo) {
    const h = 120;
    p.page.drawRectangle({ x: p.x + p.w - 88, y: top - h, width: 88, height: h, borderColor: muted, borderWidth: 0.5 });
    p.page.drawText(labels.photo, { x: p.x + p.w - 60, y: top - h / 2, size: 8, font: p.font, color: muted });
    if (p.y > top - h - 6) p.y = top - h - 6;
  }
  p.y -= p.gap;
  for (const s of d.sections.filter((x) => x.key !== "personal")) {
    if (s.entries) {
      p.text(s.heading, { f: p.bold, color: accent });
      for (const e of s.entries) row(e.dates || "—", [[e.title, e.sub].filter(Boolean).join(" — "), ...e.bullets].join("  •  "), p.w);
    } else row(s.heading, s.text ?? s.items?.join("; ") ?? s.groups?.map((g) => `${g.label}: ${g.items.join(", ")}`).join("  •  ") ?? "", p.w);
    p.y -= p.gap / 2;
  }
}

export async function renderResumePdf(d: DocModel): Promise<Uint8Array> {
  const t = d.template;
  const { doc, p } = await pdfBase(t);
  doc.setTitle(`${d.name} - ${t.name}`);
  doc.setAuthor(d.name);
  doc.setCreator("CareerMatch AI");
  const accent = hexRgb(t.style.accent);
  const jpg = photoBytes(d.photo);
  if (jpg) p.photo = await doc.embedJpg(jpg);
  p.newPage();

  if (t.layout === "form") {
    pdfForm(p, d, accent);
    return doc.save();
  }
  if (t.layout === "sidebar") {
    // Left panel on page 1: contact, skills, languages, personal details.
    const SW = 168;
    const dark = t.style.sidebar === "dark";
    const right = t.style.sidebarSide === "right";
    const sx = right ? p.W - SW : 0;
    const sideInk = dark ? white : ink;
    p.page.drawRectangle({ x: sx, y: 0, width: SW, height: p.H, color: dark ? accent : tint(t.style.accent, 0.88) });
    const side = new Pdf(doc, t, p.font, p.bold, sx + 22, SW - 40);
    side.photo = p.photo;
    side.page = p.page;
    side.y = p.H - p.M;
    side.onNewPage = undefined;
    if (t.style.header === "photo") {
      photoCircle(side, sx + SW / 2, side.y - 42, 42, dark ? white : accent, d.name);
      side.y -= 96;
    }
    side.text(d.name, { f: p.bold, size: 16, color: dark ? white : accent, lead: 20 });
    if (d.headline) side.text(d.headline, { size: p.size, color: dark ? white : muted });
    side.y -= 10;
    for (const c of d.contact) side.text(c, { size: p.size - 1.2, color: sideInk });
    for (const s of d.sections.filter((x) => x.key === "skills" || x.key === "languages" || x.key === "personal")) {
      side.y -= 10;
      side.text(s.heading.toUpperCase(), { f: p.bold, size: p.size - 0.4, color: dark ? white : accent });
      if (s.text) side.text(s.text, { size: p.size - 1, color: sideInk });
      for (const g of s.groups ?? []) side.text(`${g.label}: ${g.items.join(", ")}`, { size: p.size - 1, color: sideInk });
      for (const [k, v] of s.pairs ?? []) side.text(`${k}: ${v}`, { size: p.size - 1, color: sideInk });
    }
    p.x = right ? p.M : SW + 24;
    p.w = right ? p.W - SW - 24 - p.M : p.W - p.x - p.M;
    for (const s of d.sections.filter((x) => !["skills", "languages", "personal"].includes(x.key))) section(p, s, accent, false);
    return doc.save();
  }
  pdfHeader(p, d, accent, t.layout === "banner");
  for (const s of d.sections) section(p, s, accent, t.layout === "tabular");
  return doc.save();
}

export async function renderLetterPdf(letter: CoverLetter, d: Pick<DocModel, "name" | "headline" | "contact" | "template">): Promise<Uint8Array> {
  const t = d.template.layout === "form" ? { ...d.template, layout: "ats" as const } : d.template;
  const { doc, p } = await pdfBase(t);
  doc.setTitle(`${d.name} - Cover letter`);
  doc.setAuthor(d.name);
  const accent = hexRgb(t.style.accent);
  p.newPage();
  pdfHeader(p, d, accent, t.layout === "banner");
  const b = letterBlocks(letter);
  p.y -= p.gap;
  p.text(b.date, { color: muted });
  p.y -= p.gap;
  p.text(b.subject, { f: p.bold });
  p.y -= p.gap;
  p.text(b.greeting);
  for (const para of b.paragraphs) {
    p.y -= p.gap * 0.8;
    p.text(para, { lead: p.size * 1.45 });
  }
  p.y -= p.gap;
  p.text(b.closing);
  p.text(b.signature, { f: p.bold });
  return doc.save();
}

/** Résumé followed by cover letter in one PDF. */
export async function mergePdfs(parts: Uint8Array[]) {
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    for (const page of await out.copyPages(src, src.getPageIndices())) out.addPage(page);
  }
  return out.save();
}

// --- DOCX ------------------------------------------------------------------------

const DOCX_PAGE = { A4: { width: 11906, height: 16838 }, Letter: { width: 12240, height: 15840 } } as const;
const EAST_ASIA: Partial<Record<string, string>> = { ja: "Yu Gothic", ko: "Malgun Gothic", zh: "Microsoft YaHei" };

function docxKit(t: TemplateDef) {
  const font = t.style.font === "serif" ? "Cambria" : "Calibri";
  const ea = EAST_ASIA[t.lang];
  const size = DENSITY[t.style.density].size;
  const half = (pt: number) => Math.round(pt * 2);
  const accent = t.style.accent.slice(1);
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text, bold: o.bold, size: half(o.size ?? size), color: o.color, font: ea ? { ascii: font, hAnsi: font, eastAsia: ea } : font });
  const after = DENSITY[t.style.density].gap * 10;
  const align = t.style.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT;
  return { font, size, run, accent, after, align };
}

function docxSections(d: DocModel, k: ReturnType<typeof docxKit>, tabular: boolean): Paragraph[] {
  const out: Paragraph[] = [];
  const variant = d.template.style.heading ?? "rule";
  const head = (text: string) =>
    variant === "pill"
      ? new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: k.after * 1.4, after: k.after / 2 }, children: [new TextRun({ text: ` ${text.toUpperCase()} `, bold: true, size: Math.round(k.size * 2), color: "FFFFFF", font: k.font, shading: { type: ShadingType.CLEAR, fill: k.accent, color: "auto" } })] })
      : new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: k.after * 1.4, after: k.after / 2 },
          border:
            variant === "rule"
              ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: k.accent, space: 1 } }
              : variant === "bar" || variant === "border"
                ? { left: { style: BorderStyle.SINGLE, size: 24, color: k.accent, space: 6 } }
                : variant === "editorial"
                  ? { top: { style: BorderStyle.SINGLE, size: 18, color: k.accent, space: 4 } }
                  : undefined,
          children: [k.run(text.toUpperCase(), { bold: true, size: k.size + 0.6, color: k.accent })],
        });
  for (const s of d.sections) {
    out.push(head(s.heading));
    if (s.text) out.push(new Paragraph({ spacing: { after: k.after / 2 }, children: [k.run(s.text)] }));
    for (const i of s.items ?? []) out.push(new Paragraph({ bullet: { level: 0 }, children: [k.run(i)] }));
    for (const g of s.groups ?? []) out.push(new Paragraph({ children: [k.run(`${g.label}: `, { bold: true }), k.run(g.items.join(", "))] }));
    for (const [key, v] of s.pairs ?? []) out.push(new Paragraph({ children: [k.run(`${key}: `, { bold: true }), k.run(v)] }));
    for (const e of s.entries ?? []) {
      const title = [e.title, e.sub].filter(Boolean).join(" — ");
      out.push(
        tabular
          ? new Paragraph({ tabStops: [{ type: TabStopType.LEFT, position: 1900 }], indent: { left: 1900, hanging: 1900 }, spacing: { before: k.after / 2 }, children: [k.run(e.dates, { color: "555B66" }), k.run(`\t${title}`, { bold: true })] })
          : new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9300 }], spacing: { before: k.after / 2 }, children: [k.run(title, { bold: true }), ...(e.dates ? [k.run(`\t${e.dates}`, { color: "555B66" })] : [])] }),
      );
      if (e.location) out.push(new Paragraph({ indent: tabular ? { left: 1900 } : undefined, children: [k.run(e.location, { color: "555B66", size: k.size - 0.6 })] }));
      if (e.text) out.push(new Paragraph({ indent: tabular ? { left: 1900 } : undefined, children: [k.run(e.text)] }));
      for (const b of e.bullets) out.push(new Paragraph({ bullet: { level: 0 }, indent: tabular ? { left: 2260, hanging: 360 } : undefined, children: [k.run(b)] }));
    }
  }
  return out;
}

const photoRun = (d: Pick<DocModel, "photo">, px: number) => {
  const data = photoBytes(d.photo);
  return data ? new ImageRun({ type: "jpg", data, transformation: { width: px, height: px } }) : null;
};

function docxHeader(d: Pick<DocModel, "name" | "headline" | "contact" | "template" | "photo">, k: ReturnType<typeof docxKit>, banner: boolean): Paragraph[] {
  const variant = d.template.style.header ?? "plain";
  const photo = variant === "photo" ? photoRun(d, 96) : null;
  if (photo && !banner)
    return [
      new Paragraph({ spacing: { after: 80 }, children: [photo] }),
      new Paragraph({ heading: HeadingLevel.TITLE, children: [k.run(d.name, { bold: true, size: 21 })] }),
      ...(d.headline ? [new Paragraph({ children: [k.run(d.headline, { bold: true, size: k.size + 1, color: k.accent })] })] : []),
      new Paragraph({ spacing: { after: k.after }, children: [k.run(d.contact.join("  |  "), { size: k.size - 0.6, color: "555B66" })] }),
    ];
  if (variant === "photo" && !banner) return docxHeader({ ...d, template: { ...d.template, style: { ...d.template.style, header: "monogram" } } }, k, banner);
  if (!banner && variant === "monogram")
    return [
      new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: ` ${initialsOf(d.name)} `, bold: true, size: 40, color: "FFFFFF", font: k.font, shading: { type: ShadingType.CLEAR, fill: k.accent, color: "auto" } }), k.run(`  ${d.name}`, { bold: true, size: 21 })] }),
      ...(d.headline ? [new Paragraph({ children: [k.run(d.headline, { bold: true, size: k.size + 1, color: k.accent })] })] : []),
      new Paragraph({ spacing: { after: k.after }, children: [k.run(d.contact.join("  |  "), { size: k.size - 0.6, color: "555B66" })] }),
    ];
  if (!banner && variant === "split")
    return [
      new Paragraph({ heading: HeadingLevel.TITLE, tabStops: [{ type: TabStopType.RIGHT, position: 9300 }], children: [k.run(d.name, { bold: true, size: 22 }), k.run(`\t${d.contact[0] ?? ""}`, { size: k.size - 0.8, color: "555B66" })] }),
      new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9300 }], children: [k.run(d.headline, { bold: true, size: k.size + 1, color: k.accent }), k.run(`\t${d.contact.slice(1).join("  |  ")}`, { size: k.size - 0.8, color: "555B66" })] }),
      new Paragraph({ spacing: { after: k.after }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: k.accent, space: 4 } }, children: [] }),
    ];
  if (banner)
    return [
      ...(photo ? [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 60 }, children: [photo] })] : []),
      new Paragraph({ shading: { type: ShadingType.CLEAR, fill: k.accent, color: "auto" }, spacing: { after: 0 }, children: [k.run(` ${d.name}`, { bold: true, size: 22, color: "FFFFFF" })] }),
      new Paragraph({ shading: { type: ShadingType.CLEAR, fill: k.accent, color: "auto" }, spacing: { after: k.after }, children: [k.run(` ${d.headline}`, { size: 11, color: "FFFFFF" })] }),
      new Paragraph({ spacing: { after: k.after }, children: [k.run(d.contact.join("  |  "), { color: "555B66", size: k.size - 0.6 })] }),
    ];
  return [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: k.align, children: [k.run(d.name, { bold: true, size: 21, color: k.accent === "111827" ? undefined : k.accent })] }),
    ...(d.headline ? [new Paragraph({ alignment: k.align, children: [k.run(d.headline, { size: k.size + 1, color: "555B66" })] })] : []),
    new Paragraph({ alignment: k.align, spacing: { after: k.after }, children: [k.run(d.contact.join("  |  "), { size: k.size - 0.6, color: "555B66" })] }),
  ];
}

const cell = (children: Paragraph[], o: { width: number; fill?: string } = { width: 50 }) =>
  new TableCell({ width: { size: o.width, type: WidthType.PERCENTAGE }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: children.length ? children : [new Paragraph("")] });

function docxBody(d: DocModel, k: ReturnType<typeof docxKit>): (Paragraph | Table)[] {
  const t = d.template;
  if (t.layout === "form") {
    const labels = labelsFor(d.lang);
    const title = { ja: "履 歴 書", ko: "이 력 서", zh: "个 人 简 历" }[t.lang as "ja"] ?? "BIODATA";
    const rows = [
      ["Name", d.name],
      ["Contact", d.contact.join("  |  ")],
      ...(d.sections.find((s) => s.key === "personal")?.pairs ?? []),
    ].map(([a, b]) => new TableRow({ children: [cell([new Paragraph({ children: [k.run(a, { bold: true })] })], { width: 25, fill: "F3F4F6" }), cell([new Paragraph({ children: [k.run(b)] })], { width: 75 })] }));
    const history = d.sections.filter((s) => s.key !== "personal").flatMap((s) =>
      s.entries
        ? [new TableRow({ children: [cell([new Paragraph({ children: [k.run(s.heading, { bold: true, color: k.accent })] })], { width: 100, fill: "F9FAFB" })] }), ...s.entries.map((e) => new TableRow({ children: [cell([new Paragraph({ children: [k.run(e.dates || "—")] })], { width: 25 }), cell([new Paragraph({ children: [k.run([e.title, e.sub].filter(Boolean).join(" — "), { bold: true })] }), ...e.bullets.map((b) => new Paragraph({ bullet: { level: 0 }, children: [k.run(b)] }))], { width: 75 })] }))]
        : [new TableRow({ children: [cell([new Paragraph({ children: [k.run(s.heading, { bold: true })] })], { width: 25, fill: "F3F4F6" }), cell([new Paragraph({ children: [k.run(s.text ?? s.items?.join("; ") ?? s.groups?.map((g) => `${g.label}: ${g.items.join(", ")}`).join(" · ") ?? "")] })], { width: 75 })] })],
    );
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: k.after }, children: [k.run(title, { bold: true, size: 18 })] }),
      ...(t.photo !== "omit" ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [k.run(`[ ${labels.photo} ]`, { color: "888888" })] })] : []),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
      new Paragraph(""),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: history }),
    ];
  }
  if (t.layout === "sidebar") {
    const sideKeys = ["skills", "languages", "personal"];
    const dark = t.style.sidebar === "dark";
    const sc = dark ? "FFFFFF" : undefined;
    const sidePhoto = t.style.header === "photo" ? photoRun(d, 110) : null;
    const side: Paragraph[] = [
      ...(sidePhoto ? [new Paragraph({ spacing: { after: 120 }, children: [sidePhoto] })] : []),
      new Paragraph({ children: [k.run(d.name, { bold: true, size: 16, color: dark ? "FFFFFF" : k.accent })] }),
      ...(d.headline ? [new Paragraph({ spacing: { after: k.after }, children: [k.run(d.headline, { color: dark ? "FFFFFF" : "555B66" })] })] : []),
      ...d.contact.map((c) => new Paragraph({ children: [k.run(c, { size: k.size - 1, color: sc })] })),
      ...d.sections.filter((s) => sideKeys.includes(s.key)).flatMap((s) => [
        new Paragraph({ spacing: { before: k.after * 1.2 }, children: [k.run(s.heading.toUpperCase(), { bold: true, color: dark ? "FFFFFF" : k.accent })] }),
        ...(s.text ? [new Paragraph({ children: [k.run(s.text, { size: k.size - 1, color: sc })] })] : []),
        ...(s.groups ?? []).map((g) => new Paragraph({ children: [k.run(`${g.label}: `, { bold: true, size: k.size - 1, color: sc }), k.run(g.items.join(", "), { size: k.size - 1, color: sc })] })),
        ...(s.pairs ?? []).map(([a, b]) => new Paragraph({ children: [k.run(`${a}: ${b}`, { size: k.size - 1, color: sc })] })),
      ]),
    ];
    const main = docxSections({ ...d, sections: d.sections.filter((s) => !sideKeys.includes(s.key)) }, k, false);
    return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } }, rows: [new TableRow({ children: t.style.sidebarSide === "right" ? [cell(main, { width: 68 }), cell(side, { width: 32, fill: dark ? k.accent : "F4F1FB" })] : [cell(side, { width: 32, fill: dark ? k.accent : "F4F1FB" }), cell(main, { width: 68 })] })] })];
  }
  return [...docxHeader(d, k, t.layout === "banner"), ...docxSections(d, k, t.layout === "tabular")];
}

const docxDocument = (t: TemplateDef, title: string, author: string, children: (Paragraph | Table)[]) =>
  new Document({
    creator: "CareerMatch AI",
    title,
    description: author,
    sections: [{ properties: { page: { size: DOCX_PAGE[t.paper], margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  });

export async function renderResumeDocx(d: DocModel): Promise<Buffer> {
  return Packer.toBuffer(docxDocument(d.template, `${d.name} - ${d.template.name}`, d.name, docxBody(d, docxKit(d.template))));
}

export async function renderLetterDocx(letter: CoverLetter, d: Pick<DocModel, "name" | "headline" | "contact" | "template">): Promise<Buffer> {
  const k = docxKit(d.template);
  const b = letterBlocks(letter);
  const children = [
    ...docxHeader(d, k, d.template.layout === "banner"),
    new Paragraph({ spacing: { before: k.after, after: k.after }, children: [k.run(b.date, { color: "555B66" })] }),
    new Paragraph({ spacing: { after: k.after }, children: [k.run(b.subject, { bold: true })] }),
    new Paragraph({ spacing: { after: k.after }, children: [k.run(b.greeting)] }),
    ...b.paragraphs.map((p) => new Paragraph({ spacing: { after: k.after }, children: [k.run(p)] })),
    new Paragraph({ spacing: { before: k.after }, children: [k.run(b.closing)] }),
    new Paragraph({ children: [k.run(b.signature, { bold: true })] }),
  ];
  return Packer.toBuffer(docxDocument(d.template, `${d.name} - Cover letter`, d.name, children));
}

/** The ATS-first version of any template: same language, dates and paper, single column. */
export const atsVariant = (t: TemplateDef): TemplateDef => ({ ...t, layout: t.layout === "academic" || t.layout === "federal" || t.layout === "tabular" ? t.layout : "ats", mode: "ats", style: { ...t.style, align: "left" } });

/** "Firstname_Lastname_JobTitle_Company_CV.docx" */
export function exportName(name: string, jobTitle: string, company: string, kind: "CV" | "Cover_Letter" | "Application", ext: "pdf" | "docx") {
  const part = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40);
  return [part(name) || "Resume", part(jobTitle), part(company), kind].filter(Boolean).join("_") + `.${ext}`;
}

export const pdfNeedsEnglishHeadings = (t: TemplateDef) => NON_LATIN.includes(t.lang);
