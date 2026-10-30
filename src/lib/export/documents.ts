import "server-only";
// ATS-safe document export: single column, standard headings, real text (no
// tables or images), in three visual templates, as DOCX or PDF.

import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResumeData } from "../resume/schema";

export const TEMPLATES = ["classic", "modern", "compact"] as const;
export type Template = (typeof TEMPLATES)[number];

export type ResumeDoc = {
  kind: "resume";
  name: string;
  contact: string[];
  headline: string;
  summary: string;
  skills: string[];
  experience: { title: string; company: string; dates: string; bullets: string[] }[];
  projects: { name: string; description: string }[];
  education: string[];
  certifications: string[];
};
export type LetterDoc = { kind: "letter"; name: string; contact: string[]; subject: string; body: string };
export type ExportDoc = ResumeDoc | LetterDoc;

export function contactLine(r: Pick<ResumeData, "email" | "phone" | "location" | "links">) {
  return [r.email, r.phone, r.location, ...r.links.map((l) => l.url.replace(/^https?:\/\//, ""))].filter(Boolean);
}

export function resumeDocFromProfile(r: ResumeData): ResumeDoc {
  return {
    kind: "resume",
    name: r.name,
    contact: contactLine(r),
    headline: r.headline,
    summary: r.summary,
    skills: r.skills.flatMap((g) => g.skills),
    experience: r.experience.map((e) => ({ title: e.title, company: e.company, dates: [e.startDate, e.endDate].filter(Boolean).join(" – "), bullets: e.highlights })),
    projects: r.projects.map((p) => ({ name: p.name, description: p.description })),
    education: r.education.map((e) => [e.degree, e.field, e.school, e.endDate].filter(Boolean).join(", ")),
    certifications: r.certifications.map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", ")),
  };
}

type Style = {
  pdfFont: StandardFonts;
  pdfBold: StandardFonts;
  docxFont: string;
  size: number; // body pt
  nameSize: number;
  accent: [number, number, number];
  centerHeader: boolean;
  gap: number; // pt between blocks
};

const STYLES: Record<Template, Style> = {
  classic: { pdfFont: StandardFonts.TimesRoman, pdfBold: StandardFonts.TimesRomanBold, docxFont: "Times New Roman", size: 11, nameSize: 20, accent: [0.1, 0.1, 0.1], centerHeader: true, gap: 8 },
  modern: { pdfFont: StandardFonts.Helvetica, pdfBold: StandardFonts.HelveticaBold, docxFont: "Calibri", size: 10.5, nameSize: 22, accent: [0.31, 0.27, 0.9], centerHeader: false, gap: 8 },
  compact: { pdfFont: StandardFonts.Helvetica, pdfBold: StandardFonts.HelveticaBold, docxFont: "Arial", size: 9.5, nameSize: 16, accent: [0.15, 0.2, 0.3], centerHeader: false, gap: 5 },
};

const hex = (c: [number, number, number]) => c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("");

// Standard PDF fonts only cover WinAnsi; map everything else to safe text.
const WINANSI_EXTRA = new Set("•–—‘’“”…€™‚„†‡ˆ‰Š‹ŒŽ˜šœžŸ");
function pdfSafe(s: string) {
  return s
    .replace(/[→➔]/g, "->")
    .replace(/[✓✔]/g, "v")
    .replace(/\s+/g, " ")
    .split("")
    .map((ch) => (ch.charCodeAt(0) <= 255 || WINANSI_EXTRA.has(ch) ? ch : "?"))
    .join("")
    .trim();
}

type Block =
  | { t: "name"; text: string }
  | { t: "contact"; text: string }
  | { t: "headline"; text: string }
  | { t: "heading"; text: string }
  | { t: "role"; left: string; right: string }
  | { t: "para"; text: string }
  | { t: "bullet"; text: string }
  | { t: "space" };

function toBlocks(doc: ExportDoc): Block[] {
  const b: Block[] = [{ t: "name", text: doc.name || "Your Name" }];
  if (doc.contact.length) b.push({ t: "contact", text: doc.contact.join("  |  ") });
  if (doc.kind === "letter") {
    b.push({ t: "space" }, { t: "para", text: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) }, { t: "space" });
    b.push({ t: "para", text: `Re: ${doc.subject}` }, { t: "space" });
    for (const p of doc.body.split(/\n\s*\n/)) {
      for (const line of p.split("\n")) b.push(line.trim().startsWith("•") ? { t: "bullet", text: line.replace(/^\s*•\s*/, "") } : { t: "para", text: line });
      b.push({ t: "space" });
    }
    return b;
  }
  if (doc.headline) b.push({ t: "headline", text: doc.headline });
  if (doc.summary) b.push({ t: "heading", text: "Summary" }, { t: "para", text: doc.summary });
  if (doc.skills.length) b.push({ t: "heading", text: "Skills" }, { t: "para", text: doc.skills.join(" • ") });
  if (doc.experience.length) {
    b.push({ t: "heading", text: "Experience" });
    for (const e of doc.experience) {
      b.push({ t: "role", left: [e.title, e.company].filter(Boolean).join(" — "), right: e.dates });
      for (const x of e.bullets.filter(Boolean)) b.push({ t: "bullet", text: x });
      b.push({ t: "space" });
    }
  }
  if (doc.projects.length) {
    b.push({ t: "heading", text: "Projects" });
    for (const p of doc.projects) b.push({ t: "bullet", text: p.description ? `${p.name}: ${p.description}` : p.name });
  }
  if (doc.education.length) b.push({ t: "heading", text: "Education" }, ...doc.education.map((text) => ({ t: "para" as const, text })));
  if (doc.certifications.length) b.push({ t: "heading", text: "Certifications" }, ...doc.certifications.map((text) => ({ t: "para" as const, text })));
  return b;
}

// --- PDF ------------------------------------------------------------------------

export async function renderPdf(doc: ExportDoc, template: Template): Promise<Uint8Array> {
  const st = STYLES[template];
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.kind === "resume" ? `${doc.name} - Resume` : `${doc.name} - Cover letter`);
  pdf.setAuthor(doc.name);
  pdf.setCreator("CareerMatch AI");
  const font = await pdf.embedFont(st.pdfFont);
  const bold = await pdf.embedFont(st.pdfBold);
  const W = 612, H = 792, M = template === "compact" ? 44 : 54;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const accent = rgb(...st.accent);
  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.35, 0.37, 0.42);

  const ensure = (h: number) => {
    if (y - h < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
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
  };
  const draw = (text: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; center?: boolean; lead?: number }) => {
    const f = o.f ?? font, size = o.size ?? st.size, lead = o.lead ?? size * 1.3, indent = o.indent ?? 0;
    for (const line of wrap(text, f, size, W - 2 * M - indent)) {
      ensure(lead);
      const x = o.center ? (W - f.widthOfTextAtSize(line, size)) / 2 : M + indent;
      page.drawText(line, { x, y: y - size, size, font: f, color: o.color ?? ink });
      y -= lead;
    }
  };

  for (const b of toBlocks(doc)) {
    switch (b.t) {
      case "name":
        draw(b.text, { f: bold, size: st.nameSize, center: st.centerHeader, color: template === "modern" ? accent : ink, lead: st.nameSize * 1.2 });
        break;
      case "contact":
        draw(b.text, { size: st.size - 1, color: muted, center: st.centerHeader });
        y -= st.gap / 2;
        break;
      case "headline":
        draw(b.text, { f: bold, size: st.size + 1, center: st.centerHeader, color: muted });
        break;
      case "heading":
        y -= st.gap;
        ensure(st.size * 3);
        draw(b.text.toUpperCase(), { f: bold, size: st.size + 0.5, color: accent });
        page.drawLine({ start: { x: M, y: y + 2 }, end: { x: W - M, y: y + 2 }, thickness: template === "classic" ? 0.8 : 0.5, color: template === "modern" ? accent : muted });
        y -= st.gap / 2;
        break;
      case "role": {
        ensure(st.size * 3);
        const right = pdfSafe(b.right);
        const rw = font.widthOfTextAtSize(right, st.size);
        const leftLines = wrap(b.left, bold, st.size, W - 2 * M - rw - 12);
        leftLines.forEach((line, i) => {
          page.drawText(line, { x: M, y: y - st.size, size: st.size, font: bold, color: ink });
          if (i === 0 && right) page.drawText(right, { x: W - M - rw, y: y - st.size, size: st.size, font, color: muted });
          y -= st.size * 1.35;
        });
        break;
      }
      case "para":
        draw(b.text, {});
        break;
      case "bullet": {
        const lines = wrap(b.text, font, st.size, W - 2 * M - 12);
        lines.forEach((line, i) => {
          ensure(st.size * 1.3);
          if (i === 0) page.drawText("•", { x: M + 2, y: y - st.size, size: st.size, font, color: ink });
          page.drawText(line, { x: M + 12, y: y - st.size, size: st.size, font, color: ink });
          y -= st.size * 1.3;
        });
        break;
      }
      case "space":
        y -= st.gap / 2;
        break;
    }
  }
  return pdf.save();
}

// --- DOCX -----------------------------------------------------------------------

export async function renderDocx(doc: ExportDoc, template: Template): Promise<Buffer> {
  const st = STYLES[template];
  const half = (pt: number) => Math.round(pt * 2);
  const color = hex(st.accent);
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text, bold: o.bold, size: half(o.size ?? st.size), color: o.color, font: st.docxFont });
  const center = st.centerHeader ? AlignmentType.CENTER : AlignmentType.LEFT;
  const after = st.gap * 10;

  const children = toBlocks(doc).map((b) => {
    switch (b.t) {
      case "name":
        return new Paragraph({ alignment: center, children: [run(b.text, { bold: true, size: st.nameSize, color: template === "modern" ? color : undefined })] });
      case "contact":
        return new Paragraph({ alignment: center, spacing: { after }, children: [run(b.text, { size: st.size - 1, color: "555B66" })] });
      case "headline":
        return new Paragraph({ alignment: center, children: [run(b.text, { bold: true, size: st.size + 1, color: "555B66" })] });
      case "heading":
        return new Paragraph({
          spacing: { before: after * 1.5, after: after / 2 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: template === "modern" ? color : "888888", space: 1 } },
          children: [run(b.text.toUpperCase(), { bold: true, size: st.size + 0.5, color })],
        });
      case "role":
        return new Paragraph({
          tabStops: [{ type: "right", position: 9360 }],
          spacing: { before: after / 2 },
          children: [run(b.left, { bold: true }), run(`\t${b.right}`, { color: "555B66" })],
        });
      case "para":
        return new Paragraph({ spacing: { after: after / 2 }, children: [run(b.text)] });
      case "bullet":
        return new Paragraph({ bullet: { level: 0 }, children: [run(b.text)] });
      case "space":
        return new Paragraph({ children: [] });
    }
  });

  const document = new Document({
    creator: "CareerMatch AI",
    title: doc.kind === "resume" ? `${doc.name} - Resume` : `${doc.name} - Cover letter`,
    sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1080, right: 1080 } } }, children }],
  });
  return Packer.toBuffer(document);
}

export function fileName(doc: ExportDoc, format: "pdf" | "docx") {
  const base = (doc.name || "resume").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  return `${base}_${doc.kind === "resume" ? "Resume" : "Cover_Letter"}.${format}`;
}
