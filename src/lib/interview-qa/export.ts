import "server-only";
import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, ShadingType, TextRun } from "docx";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfSafe } from "../templates/render";
import type { InterviewQ } from "./store";

type Block = { kind: "text" | "code" | "bullet" | "heading"; text: string };

/** Markdown answer -> simple blocks (code stays verbatim; inline markup is flattened). */
export function blocksOf(md: string): Block[] {
  const out: Block[] = [];
  const inline = (s: string) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/(^|\W)_([^_]+)_(\W|$)/g, "$1$2$3").replace(/`([^`]+)`/g, "$1").trim();
  const parts = md.split(/```[\w+-]*\n?/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      if (part.trim()) out.push({ kind: "code", text: part.replace(/\s+$/, "") });
      return;
    }
    for (const line of part.split("\n")) {
      const t = line.trim();
      if (!t || /^<\/?\w/.test(t) || /^\|?[-: |]+\|?$/.test(t)) continue;
      const b = t.match(/^(?:[-*+]|\d+\.)\s+(.+)/);
      const h = t.match(/^#{1,6}\s+(.+)/);
      if (h) out.push({ kind: "heading", text: inline(h[1]) });
      else if (b) out.push({ kind: "bullet", text: inline(b[1]) });
      else out.push({ kind: "text", text: inline(t.replace(/^\|(.+)\|$/, "$1").replace(/\s*\|\s*/g, " · ")) });
    }
  });
  return out;
}

const meta = (q: InterviewQ) => [q.questionType, q.company, q.roles.slice(0, 2).join(", "), q.experienceLevel, ...q.tools.slice(0, 3), ...q.skills.slice(0, 3)].filter(Boolean).join(" · ");
const answerLabel = (q: InterviewQ) => (q.answerOrigin === "ai" ? (q.questionType === "Behavioral" ? "Sample STAR answer (AI-drafted, illustrative: use your own story)" : "AI-drafted answer (check before using)") : q.answerOrigin === "user" ? "Answer shared by the reporting user" : "Answer from the source collection");

function sourcesOf(qs: InterviewQ[]) {
  const m = new Map<string, string>();
  for (const q of qs) m.set(q.attribution, q.source === "user" ? "" : q.sourceUrl.replace(/\/blob\/.*$/, ""));
  return [...m].map(([a, url]) => (url ? `${a} - ${url}` : a));
}

// --- PDF ----------------------------------------------------------------------------
export async function interviewPdf(title: string, subtitle: string, qs: InterviewQ[]) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("CareerMatch AI");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const W = 595.28, H = 841.89, M = 50;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.06, 0.08, 0.17), muted = rgb(0.38, 0.4, 0.48), brand = rgb(0.26, 0.39, 1);
  const newPage = () => {
    page = doc.addPage([W, H]);
    y = H - M;
  };
  const wrap = (s: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    for (const para of pdfSafe(s).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) > width && line) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    }
    return lines;
  };
  const write = (s: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; dx?: number; gap?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 10, dx = o.dx ?? 0;
    for (const line of wrap(s, f, size, W - 2 * M - dx)) {
      if (y - size * 1.4 < M) newPage();
      page.drawText(line, { x: M + dx, y: y - size, size, font: f, color: o.color ?? ink });
      y -= size * 1.38;
    }
    y -= o.gap ?? 0;
  };
  const code = (s: string) => {
    const size = 8.6;
    const space = mono.widthOfTextAtSize(" ", size);
    for (const raw of s.replace(/\t/g, "  ").split("\n")) {
      // pdfSafe collapses whitespace, so keep the indent as an x offset instead.
      const indent = Math.min(raw.length - raw.trimStart().length, 24) * space;
      const lines = raw.trim() ? wrap(raw.trim(), mono, size, W - 2 * M - 16 - indent) : [""];
      for (const line of lines) {
        if (y - size * 1.5 < M) newPage();
        page.drawRectangle({ x: M, y: y - size * 1.45, width: W - 2 * M, height: size * 1.45, color: rgb(0.95, 0.96, 0.99) });
        page.drawText(line, { x: M + 8 + indent, y: y - size * 1.1, size, font: mono, color: ink });
        y -= size * 1.45;
      }
    }
    y -= 4;
  };

  write(title, { f: bold, size: 20, color: brand, gap: 2 });
  write(subtitle, { size: 9.5, color: muted, gap: 14 });
  qs.forEach((q, i) => {
    if (y < M + 90) newPage();
    write(`${i + 1}. ${q.question.split("\n")[0]}`, { f: bold, size: 11.5, gap: 1 });
    const extra = q.question.split("\n").slice(1).join("\n").trim();
    if (extra)
      for (const b of blocksOf(extra)) {
        if (b.kind === "code") code(b.text);
        else write(b.text, { size: 9.5, dx: 10 });
      }
    write(meta(q), { size: 8.5, color: muted, gap: 4 });
    if (q.answer) {
      write(answerLabel(q), { f: bold, size: 8.5, color: brand, gap: 1 });
      for (const b of blocksOf(q.answer)) {
        if (b.kind === "code") code(b.text);
        else if (b.kind === "bullet") write(`•  ${b.text}`, { size: 9.5, dx: 10 });
        else if (b.kind === "heading") write(b.text, { f: bold, size: 10 });
        else write(b.text, { size: 9.5 });
      }
    } else write("No answer in the source yet. Draft one with AI on CareerMatch.", { size: 9, color: muted });
    write(`Source: ${q.attribution}`, { size: 7.5, color: muted, gap: 12 });
  });
  newPage();
  write("Sources and licences", { f: bold, size: 13, gap: 6 });
  for (const s of sourcesOf(qs)) write(`•  ${s}`, { size: 9 });
  write("Collections are used under their open licences (MIT or CC BY 4.0) with attribution. AI-drafted answers are labelled as such.", { size: 8.5, color: muted });
  return doc.save();
}

// --- DOCX --------------------------------------------------------------------------------
export async function interviewDocx(title: string, subtitle: string, qs: InterviewQ[]) {
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string; mono?: boolean } = {}) => new TextRun({ text, bold: o.bold, size: Math.round((o.size ?? 10) * 2), color: o.color, font: o.mono ? "Consolas" : "Calibri" });
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(title, { bold: true, size: 20, color: "4263FF" })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(subtitle, { size: 9.5, color: "5B6170" })] }),
  ];
  const codePara = (line: string) => new Paragraph({ shading: { type: ShadingType.CLEAR, fill: "F2F4FB", color: "auto" }, spacing: { after: 0 }, children: [run(line || " ", { mono: true, size: 9 })] });
  qs.forEach((q, i) => {
    const [first, ...rest] = q.question.split("\n");
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E3E8F5", space: 6 } }, children: [run(`${i + 1}. ${first}`, { bold: true, size: 12 })] }));
    for (const b of blocksOf(rest.join("\n"))) {
      if (b.kind === "code") b.text.split("\n").forEach((l) => children.push(codePara(l)));
      else children.push(new Paragraph({ children: [run(b.text)] }));
    }
    children.push(new Paragraph({ spacing: { after: 80 }, children: [run(meta(q), { size: 8.5, color: "5B6170" })] }));
    if (q.answer) {
      children.push(new Paragraph({ children: [run(answerLabel(q), { bold: true, size: 8.5, color: "4263FF" })] }));
      for (const b of blocksOf(q.answer)) {
        if (b.kind === "code") b.text.split("\n").forEach((l) => children.push(codePara(l)));
        else if (b.kind === "bullet") children.push(new Paragraph({ bullet: { level: 0 }, children: [run(b.text)] }));
        else children.push(new Paragraph({ children: [run(b.text, { bold: b.kind === "heading" })] }));
      }
    } else children.push(new Paragraph({ children: [run("No answer in the source yet. Draft one with AI on CareerMatch.", { size: 9, color: "5B6170" })] }));
    children.push(new Paragraph({ children: [run(`Source: ${q.attribution}`, { size: 7.5, color: "8A90A0" })] }));
  });
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [run("Sources and licences", { bold: true, size: 14 })] }));
  for (const s of sourcesOf(qs)) children.push(new Paragraph({ bullet: { level: 0 }, children: [run(s, { size: 9 })] }));
  children.push(new Paragraph({ alignment: AlignmentType.LEFT, children: [run("Collections are used under their open licences (MIT or CC BY 4.0) with attribution. AI-drafted answers are labelled as such.", { size: 8.5, color: "5B6170" })] }));
  return Packer.toBuffer(new Document({ creator: "CareerMatch AI", title, sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }] }));
}
