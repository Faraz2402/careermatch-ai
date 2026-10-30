import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export type ExtractResult = { text: string; format: "pdf" | "docx" | "text" };

export async function extractResumeText(file: File): Promise<ExtractResult> {
  if (file.size > MAX_RESUME_BYTES) throw new Error("File is larger than 5 MB.");
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());

  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx =
    name.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  if (isPdf) {
    // Check the magic bytes rather than trusting the extension.
    if (String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") throw new Error("This file is not a valid PDF.");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return { text: normalize(text), format: "pdf" };
  }
  if (isDocx) {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error("This file is not a valid DOCX.");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return { text: normalize(value), format: "docx" };
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return { text: normalize(new TextDecoder().decode(buf)), format: "text" };
  }
  throw new Error("Unsupported file type. Upload a PDF or DOCX, or paste your resume text.");
}

export function normalize(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[•●▪‣⁃]/g, "•")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
