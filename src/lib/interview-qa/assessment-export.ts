import "server-only";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { pdfDrops, pdfSafe } from "../templates/render";
import { scoreAssessment, type McqItem } from "./assessment";

export type AssessmentDoc = { skill: string; language: string; items: McqItem[]; answers?: (string | null)[] };

const LETTERS = ["A", "B", "C", "D"];
const dateLine = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const subtitleOf = (d: AssessmentDoc) => {
  const s = d.answers?.length ? scoreAssessment(d.items, d.answers) : null;
  return [`${d.items.length} questions`, d.language, s ? `Score ${s.correct}/${s.total} (${s.percent}%)` : "", "CareerMatch AI", dateLine()].filter(Boolean).join(" · ");
};
const NOTE = "AI-generated practice questions for self-assessment. Not an official certification and not taken from any employer or test provider.";

/** True when the standard PDF fonts cannot show this test's script (e.g. Hindi, Japanese, Arabic). */
export const assessmentPdfUnsupported = (d: AssessmentDoc) => pdfDrops([d.skill, ...d.items.flatMap((it) => [it.question, ...it.options, it.explanation])].join(" "));

export async function assessmentPdf(d: AssessmentDoc) {
  const doc = await PDFDocument.create();
  const title = `${d.skill} - Skill Assessment`;
  doc.setTitle(pdfSafe(title));
  doc.setCreator("CareerMatch AI");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 50;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const ink = rgb(0.06, 0.08, 0.17), muted = rgb(0.38, 0.4, 0.48), brand = rgb(0.26, 0.39, 1), good = rgb(0.04, 0.48, 0.35), bad = rgb(0.77, 0.25, 0.23);
  const wrap = (s: string, f: PDFFont, size: number, width: number) => {
    const lines: string[] = [];
    let line = "";
    for (const word of pdfSafe(s).split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    return lines;
  };
  const write = (s: string, o: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; dx?: number; gap?: number } = {}) => {
    const f = o.f ?? font, size = o.size ?? 10, dx = o.dx ?? 0;
    for (const line of wrap(s, f, size, W - 2 * M - dx)) {
      if (y - size * 1.4 < M) {
        page = doc.addPage([W, H]);
        y = H - M;
      }
      page.drawText(line, { x: M + dx, y: y - size, size, font: f, color: o.color ?? ink });
      y -= size * 1.38;
    }
    y -= o.gap ?? 0;
  };

  write(title, { f: bold, size: 20, color: brand, gap: 2 });
  write(subtitleOf(d), { size: 9.5, color: muted, gap: 4 });
  write(NOTE, { size: 8.5, color: muted, gap: 14 });
  d.items.forEach((it, i) => {
    if (y < M + 120) {
      page = doc.addPage([W, H]);
      y = H - M;
    }
    write(`${i + 1}. ${it.question}`, { f: bold, size: 11, gap: 1 });
    write(it.difficulty, { size: 8, color: muted, gap: 3 });
    const picked = d.answers?.[i];
    it.options.forEach((o, j) => {
      const right = o === it.correct_answer;
      const mark = right ? "  (correct)" : picked === o ? "  (your answer)" : "";
      write(`${LETTERS[j]}. ${o}${mark}`, { f: right ? bold : font, size: 9.8, dx: 12, color: right ? good : picked === o ? bad : ink });
    });
    write(`Answer: ${LETTERS[it.options.indexOf(it.correct_answer)]}. ${it.correct_answer}`, { f: bold, size: 9, color: brand, gap: 1 });
    write(it.explanation, { size: 9, color: muted, gap: 12 });
  });
  return doc.save();
}

export async function assessmentDocx(d: AssessmentDoc) {
  const run = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) => new TextRun({ text, bold: o.bold, size: Math.round((o.size ?? 10.5) * 2), color: o.color, font: "Calibri" });
  const title = `${d.skill} - Skill Assessment`;
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [run(title, { bold: true, size: 20, color: "4263FF" })] }),
    new Paragraph({ children: [run(subtitleOf(d), { size: 9.5, color: "5B6170" })] }),
    new Paragraph({ spacing: { after: 240 }, children: [run(NOTE, { size: 8.5, color: "5B6170" })] }),
  ];
  d.items.forEach((it, i) => {
    const picked = d.answers?.[i];
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280 }, children: [run(`${i + 1}. ${it.question}`, { bold: true, size: 12 })] }));
    children.push(new Paragraph({ children: [run(it.difficulty, { size: 8.5, color: "5B6170" })] }));
    it.options.forEach((o, j) => {
      const right = o === it.correct_answer;
      const mark = right ? "  (correct)" : picked === o ? "  (your answer)" : "";
      children.push(new Paragraph({ indent: { left: 360 }, children: [run(`${LETTERS[j]}. ${o}${mark}`, { bold: right, color: right ? "0B7A5A" : picked === o ? "C4413A" : undefined })] }));
    });
    children.push(new Paragraph({ spacing: { before: 80 }, children: [run(`Answer: ${LETTERS[it.options.indexOf(it.correct_answer)]}. ${it.correct_answer}`, { bold: true, size: 9.5, color: "4263FF" })] }));
    children.push(new Paragraph({ children: [run(it.explanation, { size: 9.5, color: "5B6170" })] }));
  });
  return Packer.toBuffer(new Document({ creator: "CareerMatch AI", title, sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }] }));
}
