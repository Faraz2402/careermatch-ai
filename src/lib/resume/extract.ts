import "server-only";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { documentOcrEnabled, transcribeDocument } from "../ai";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/** `ocr`: the text came from reading a scanned image, so it needs a careful review. */
export type ExtractResult = { text: string; format: "pdf" | "docx" | "text"; ocr: boolean; bytes: Uint8Array; mimeType: string };

/** Below this much text a PDF is treated as scanned (image only). */
const SCANNED_PDF_CHARS = 80;

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
    const pdf = await getDocumentProxy(buf.slice());
    const { text } = await extractText(pdf, { mergePages: true });
    const direct = normalize(text);
    if (direct.length >= SCANNED_PDF_CHARS || !documentOcrEnabled()) return { text: direct, format: "pdf", ocr: false, bytes: buf, mimeType: "application/pdf" };
    // Scanned PDF: no selectable text, so read it as an image.
    const read = normalize(await transcribeDocument(buf, "application/pdf").catch(() => ""));
    return { text: read.length > direct.length ? read : direct, format: "pdf", ocr: read.length > direct.length, bytes: buf, mimeType: "application/pdf" };
  }
  if (isDocx) {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error("This file is not a valid DOCX.");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return { text: normalize(value), format: "docx", ocr: false, bytes: buf, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return { text: normalize(new TextDecoder().decode(buf)), format: "text", ocr: false, bytes: buf, mimeType: "text/plain" };
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
