import { Document, Packer, Paragraph } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";

const ocr = vi.hoisted(() => ({ enabled: true, text: "Jane Doe\nProcurement Analyst\nExperience\n• Ran supplier onboarding for 40 vendors across India and the UK" }));
vi.mock("@/lib/ai", () => ({
  documentOcrEnabled: () => ocr.enabled,
  transcribeDocument: vi.fn(async () => ocr.text),
}));

const { extractResumeText } = await import("@/lib/resume/extract");

const file = (bytes: Uint8Array | Buffer, name: string, type: string) => new File([new Uint8Array(bytes)], name, { type });

async function pdf(text: string | null) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  if (text) page.drawText(text, { x: 50, y: 700, size: 11, font: await doc.embedFont(StandardFonts.Helvetica) });
  return doc.save();
}

describe("résumé file extraction", () => {
  it("reads a Word document and keeps the original bytes", async () => {
    const bytes = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph("Jane Doe"), new Paragraph("Procurement Analyst with SAP Ariba experience")] }] }));
    const r = await extractResumeText(file(bytes, "jane.docx", ""));
    expect(r).toMatchObject({ format: "docx", ocr: false, mimeType: expect.stringContaining("wordprocessingml") });
    expect(r.text).toContain("SAP Ariba");
    expect(r.bytes.byteLength).toBe(bytes.byteLength);
  });

  it("reads selectable PDF text without OCR", async () => {
    const r = await extractResumeText(file(await pdf("Jane Doe - Procurement Analyst - Category management, sourcing events and supplier risk reviews across India"), "jane.pdf", "application/pdf"));
    expect(r).toMatchObject({ format: "pdf", ocr: false });
    expect(r.text).toContain("Category management");
  });

  it("falls back to OCR for a scanned PDF and flags it", async () => {
    const r = await extractResumeText(file(await pdf(null), "scan.pdf", "application/pdf"));
    expect(r).toMatchObject({ format: "pdf", ocr: true });
    expect(r.text).toContain("supplier onboarding");
  });

  it("rejects files that only pretend to be PDFs", async () => {
    await expect(extractResumeText(file(new TextEncoder().encode("not a pdf"), "fake.pdf", "application/pdf"))).rejects.toThrow(/not a valid PDF/);
  });
});
