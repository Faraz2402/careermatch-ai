import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalize } from "@/lib/resume/extract";
import { parseResumeHeuristically, splitTopLevel } from "@/lib/resume/heuristic";
import { skillTerms } from "@/lib/skills";

const r = parseResumeHeuristically(normalize(fs.readFileSync(path.join(__dirname, "fixtures/categorized-skills.txt"), "utf8")));

describe("categorized skills", () => {
  it("keeps the resume's own categories and wording", () => {
    expect(r.skills).toEqual([
      { category: "Spend Analytics & BI", skills: ["Power BI (DAX, data modeling, drill-through)", "KPI dashboards", "Tableau (basic)"] },
      { category: "ERP & Platforms", skills: ["SAP MM (PO, vendor master, MRP)", "Oracle NetSuite (P2P)", "SAP Ariba (contract data)"] },
      { category: "Tools", skills: ["Excel (advanced)", "Power Query", "SQL"] },
    ]);
  });
  it("never splits inside parentheses", () => {
    expect(splitTopLevel("A (x, y), B, C (z)")).toEqual(["A (x, y)", "B", "C (z)"]);
  });
  it("matches on the base skill and its listed sub-skills", () => {
    expect(skillTerms("Power BI (DAX, data modeling, drill-through)")).toEqual(["Power BI", "DAX", "data modeling", "drill-through"]);
    expect(skillTerms("Excel (advanced)")).toEqual(["Excel"]);
  });
});

describe("education: degree + dates, then school + place", () => {
  it("pairs each school with its own dates", () => {
    expect(r.education).toEqual([
      { school: "Example Academy of Higher Education", degree: "Post Graduate Diploma", field: "Data Science", startDate: "Jan 2018", endDate: "Dec 2018", details: "Bengaluru, India" },
      { school: "Sample University", degree: "Bachelor of Business Administration", field: "", startDate: "Sep 2006", endDate: "May 2009", details: "Pune, India" },
    ]);
  });
});

describe("certifications: name + date, then issuer", () => {
  it("joins the issuer line to its certificate", () => {
    expect(r.certifications).toEqual([{ name: "Six Sigma White Belt", issuer: "Council for Six Sigma Certification (C.S.S.C)", date: "Feb 2026" }]);
  });
});
