import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { COUNTRY_RULES, GUIDES, SAMPLES } from "@/data/resume-examples";
import { checkAll, checkSample, duplicateIssues } from "@/lib/resume-examples/checks";
import { PLAN } from "@/lib/resume-examples/catalog";
import { featured, formatFor, visibleCategories } from "@/lib/resume-examples/data";
import { examplePdf } from "@/lib/resume-examples/pdf";
import type { Sample } from "@/lib/resume-examples/types";

const base: Sample = {
  id: "accountant-uk-mid", category: "accounting-finance", role: "accountant", country: "uk", level: "mid", template: "horizon",
  content: {
    name: "Test Person", title: "Accountant", phone: "07700 900123", email: "test.person@example.com", linkedin: "linkedin.com/in/test-person", location: "Leeds",
    summary: "Chartered accountant with six years in manufacturing finance.",
    experience: [
      { title: "Accountant", company: "Fictional Ltd", location: "Leeds", start: "2023-01", end: "present", bullets: ["Closed the month in four working days instead of seven.", "Rebuilt the fixed asset register covering 2,400 items.", "Trained two apprentices on reconciliations."] },
      { title: "Assistant Accountant", company: "Made Up plc", location: "York", start: "2020-02", end: "2022-12", bullets: ["Prepared VAT returns for three entities.", "Cut aged debt over 90 days by 18%.", "Automated bank reconciliations with Excel Power Query."] },
      { title: "Accounts Assistant", company: "Invented & Co", location: "Leeds", start: "2019-01", end: "2020-01", bullets: ["Processed about 600 supplier invoices a month.", "Matched purchase orders and resolved queries.", "Supported the year-end audit file."] },
    ],
    education: [{ degree: "BSc (Hons) Accounting and Finance, 2:1", school: "University of Leeds", location: "Leeds", start: "2015-09", end: "2018-06" }],
    courses: [], languages: [{ name: "English", level: "Native" }], achievements: [{ title: "ACA qualified", detail: "Passed all exams first time." }],
    skills: ["Excel", "Xero", "VAT", "IFRS", "Reconciliations"], interests: [],
  },
};

describe("resume example checks", () => {
  it("accepts a well-formed sample", () => expect(checkSample(base)).toEqual([]));
  it("rejects real-looking phone numbers and non-example emails", () => {
    expect(checkSample({ ...base, content: { ...base.content, phone: "07911 123456" } }).map((i) => i.problem).join()).toMatch(/fictional range/);
    expect(checkSample({ ...base, content: { ...base.content, email: "a@gmail.com" } }).length).toBeGreaterThan(0);
  });
  it("catches overlapping jobs and future dates", () => {
    const jobs = base.content.experience.map((j) => ({ ...j }));
    jobs[1].end = "2023-03";
    expect(checkSample({ ...base, content: { ...base.content, experience: jobs } }).map((i) => i.problem).join()).toMatch(/overlap/);
    jobs[1].end = "2022-12";
    jobs[0].end = "2027-01";
    expect(checkSample({ ...base, content: { ...base.content, experience: jobs } }).map((i) => i.problem).join()).toMatch(/future/);
  });
  it("catches wrong currency, wrong spelling and unrealistic percentages", () => {
    const p = (summary: string) => checkSample({ ...base, content: { ...base.content, summary } }).map((i) => i.problem).join();
    expect(p("Saved $40,000 a year.")).toMatch(/currency/);
    expect(p("Led the optimization of month-end.")).toMatch(/American spelling/);
    expect(p("Grew revenue by 950% in a year.")).toMatch(/unrealistic/);
  });
  it("flags repeated and near-identical bullets across samples", () => {
    const twin = { ...base, id: "accountant-uk-senior", level: "senior" as const };
    expect(duplicateIssues([base, twin]).length).toBeGreaterThan(0);
  });
});

describe("resume example data", () => {
  it("has every planned sample, guide and country file, all passing the quality checks", () => {
    const issues = checkAll(SAMPLES, GUIDES, COUNTRY_RULES);
    expect(issues.slice(0, 20)).toEqual([]);
    expect(SAMPLES.length).toBe(PLAN.length);
  });
  it("the generated index lists every data file", () => {
    const dir = path.resolve(__dirname, "../src/data/resume-examples/samples");
    expect(readdirSync(dir).filter((f) => f.endsWith(".json")).length).toBe(SAMPLES.length);
  });
  it("home page featured lists hold up to 12 samples for the chosen country", () => {
    for (const c of ["us", "de"] as const) {
      const f = featured(c);
      expect(f.length).toBeLessThanOrEqual(12);
      expect(f.every((s) => s.country === c)).toBe(true);
    }
    expect(visibleCategories().every((c) => SAMPLES.some((s) => s.category === c.slug))).toBe(true);
  });
  it("never imports an AI or network module", () => {
    const files = ["src/lib/resume-examples/data.ts", "src/lib/resume-examples/pdf.ts", "src/lib/resume-examples/shared.ts", "src/app/api/resume-examples/featured/route.ts", "src/app/api/resume-examples/[id]/pdf/route.ts"];
    for (const f of files) expect(readFileSync(path.resolve(__dirname, "..", f), "utf8")).not.toMatch(/@\/lib\/ai|lib\/ai"|anthropic|generateStructured|fetch\(/);
  });
});

describe("resume example PDF", () => {
  it("uses Letter for the US and A4 for the UK, with selectable text", async () => {
    const us = await PDFDocument.load(await examplePdf({ ...base, country: "us", content: { ...base.content, phone: "(512) 555-0143" } }, { paper: "Letter", dateFormat: "MMM YYYY", term: "resume" }));
    expect(us.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    const uk = await PDFDocument.load(await examplePdf(base, formatFor("uk")));
    expect(Math.round(uk.getPage(0).getWidth())).toBe(595);
    expect(uk.getSubject()).toMatch(/Fictional sample/);
  });
  it("renders rupee amounts and German umlauts without crashing", async () => {
    const s = { ...base, template: "meridian" as const, content: { ...base.content, summary: "Managed a ₹2.4 crore budget in München and Köln." } };
    const pdf = await PDFDocument.load(await examplePdf(s, { paper: "A4", dateFormat: "MM/YYYY", term: "CV" }));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
