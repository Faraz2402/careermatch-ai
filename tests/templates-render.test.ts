import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { FREE_TEMPLATE_IDS, MARKETS, TEMPLATES, templateById } from "@/lib/templates/catalog";
import { buildDoc, formatDate, labelsFor, SAMPLE_PERSONAL, SAMPLE_RESUME } from "@/lib/templates/model";
import { atsVariant, exportName, mergePdfs, pdfSafe, renderLetterDocx, renderLetterPdf, renderResumeDocx, renderResumePdf } from "@/lib/templates/render";

const pdfText = async (bytes: Uint8Array) => (await extractText(await getDocumentProxy(bytes.slice()), { mergePages: true })).text;
const letter = { subject: "Application for Procurement Analyst – Ananya Sharma", greeting: "Dear Northwind hiring team,", paragraphs: ["I'm applying for the Procurement Analyst role.", "I led spend analysis across 14 indirect categories."], closing: "Best regards,", signature: "Ananya Sharma", tone: "confident", length: "concise" };

describe("template catalogue", () => {
  it("covers the launch markets with free and premium tiers", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(45);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const m of ["India", "United States", "United Kingdom", "Germany", "Japan", "UAE", "Brazil", "Global"]) expect(MARKETS).toContain(m);
    expect(FREE_TEMPLATE_IDS).toContain("in-corporate-ats");
    expect(FREE_TEMPLATE_IDS.length).toBeGreaterThanOrEqual(6);
    expect(TEMPLATES.filter((t) => t.tier === "pro").length).toBeGreaterThan(30);
    // Columns, banners and forms are always labelled Visual.
    for (const t of TEMPLATES) if (["sidebar", "banner", "form"].includes(t.layout)) expect(t.mode).toBe("visual");
    // No template forces sensitive data: they're optional fields only.
    expect(TEMPLATES.filter((t) => t.market === "United States").every((t) => !t.personal.includes("dateOfBirth"))).toBe(true);
  });

  it("formats dates per country and localises headings", () => {
    expect(formatDate("Apr 2022", { dates: "MM/YYYY" }, { present: "heute" })).toBe("04/2022");
    expect(formatDate("Apr 2022", { dates: "YYYY.MM" }, { present: "現在" })).toBe("2022.04");
    expect(formatDate("Present", { dates: "MM/YYYY" }, { present: "heute" })).toBe("heute");
    expect(labelsFor("de").experience).toBe("Berufserfahrung");
    expect(labelsFor("ja", { pdf: true }).experience).toBe("Experience");
  });

  it("only shows personal fields the market uses and the user filled in", () => {
    const us = buildDoc(SAMPLE_RESUME, templateById("us-corporate"), SAMPLE_PERSONAL);
    expect(us.sections.some((s) => s.key === "personal")).toBe(false);
    const gulf = buildDoc(SAMPLE_RESUME, templateById("ae-gulf"), { visaStatus: "Employment visa" });
    expect(gulf.sections.find((s) => s.key === "personal")?.pairs).toEqual([["Visa / work status", "Employment visa"]]);
  });
});

describe("exports", () => {
  it.each(TEMPLATES.map((t) => [t.id]))("%s renders a text PDF and an editable DOCX", async (id) => {
    const t = templateById(id);
    const pdf = await renderResumePdf(buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL, { pdf: true }));
    const text = await pdfText(pdf);
    expect(text).toContain("Ananya Sharma");
    expect(text).toMatch(/Power BI/);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeLessThanOrEqual(3);
    const docx = await renderResumeDocx(buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL));
    const raw = (await mammoth.extractRawText({ buffer: docx })).value;
    expect(raw).toContain("Ananya Sharma");
    expect(raw).toMatch(/RFQ events/);
  });

  it("renders letters, the ATS-first version and a combined pack", async () => {
    const t = templateById("global-sidebar");
    const doc = buildDoc(SAMPLE_RESUME, t, {}, { pdf: true });
    const ats = atsVariant(t);
    expect(ats).toMatchObject({ layout: "ats", mode: "ats" });
    const resume = await renderResumePdf(buildDoc(SAMPLE_RESUME, ats, {}, { pdf: true }));
    const letterPdf = await renderLetterPdf(letter, doc);
    expect(await pdfText(letterPdf)).toContain("Dear Northwind hiring team");
    const pack = await mergePdfs([resume, letterPdf]);
    expect((await PDFDocument.load(pack)).getPageCount()).toBe((await PDFDocument.load(resume)).getPageCount() + 1);
    expect((await mammoth.extractRawText({ buffer: await renderLetterDocx(letter, doc) })).value).toContain("I led spend analysis");
  });

  it("names files clearly and keeps accented text readable", () => {
    expect(exportName("Ananya Sharma", "Procurement Analyst", "Northwind (India)", "CV", "docx")).toBe("Ananya_Sharma_Procurement_Analyst_Northwind_India_CV.docx");
    // Letters the standard PDF fonts have (ó, ü) stay; others lose only their accent.
    expect(pdfSafe("Łódź Müller Şahin")).toBe("Lódz Müller Sahin");
  });
});
