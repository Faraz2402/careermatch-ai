import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { blocksOf, interviewDocx, interviewPdf } from "@/lib/interview-qa/export";
import { applyFilters, facets, parseFilters, score, type InterviewQ } from "@/lib/interview-qa/store";
import { ALL_DEPARTMENTS, ALL_ROLES, DEPARTMENTS, departmentOf, skillsFor, tagText } from "@/lib/interview-qa/taxonomy";

const q = (over: Partial<InterviewQ>): InterviewQ => ({
  id: "x",
  source: "test",
  sourceUrl: "https://example.com",
  license: "MIT",
  attribution: "Test collection (MIT licence)",
  company: null,
  department: "Engineering & Technology",
  roles: ["Frontend Developer"],
  experienceLevel: null,
  questionType: "Conceptual",
  roundType: null,
  question: "What is a closure?",
  answer: null,
  answerOrigin: null,
  tools: [],
  skills: [],
  dateAsked: null,
  sourceUpdatedAt: "2026-08-01T00:00:00.000Z",
  ...over,
});

const bank: InterviewQ[] = [
  q({ id: "a", question: "Explain event delegation in JavaScript.", skills: ["JavaScript"] }),
  q({ id: "b", department: "Data & Analytics", roles: ["Data Analyst"], questionType: "SQL", question: "Count active campaigns per day.", tools: ["SQL"], answer: "```sql\nSELECT 1;\n```", answerOrigin: "source" }),
  q({ id: "c", department: ALL_DEPARTMENTS, roles: [], questionType: "Behavioral", company: "Amazon", question: "Tell me about a time you disagreed with your manager.", skills: ["Conflict Resolution"] }),
];

describe("interview Q&A taxonomy", () => {
  it("maps every role to its department and offers role-relevant skills", () => {
    for (const d of Object.keys(DEPARTMENTS)) for (const r of DEPARTMENTS[d]) expect(departmentOf(r)).toBe(d);
    expect(ALL_ROLES.length).toBeGreaterThan(40);
    const clusters = skillsFor(["Supply Chain & Procurement"]).map((c) => c.cluster);
    expect(clusters).toContain("Supply Chain, Commerce & Procurement");
    expect(clusters).not.toContain("Data Science, AI & ML");
  });

  it("tags tools and skills from the question text", () => {
    expect(tagText("Write a SQL query with a window function to rank sales").tools).toContain("SQL");
    expect(tagText("Build a DAX measure for year-to-date revenue in Power BI").tools).toContain("Power BI");
    expect(tagText("Tell me about a time you had a conflict with a co-worker").skills).toEqual(expect.arrayContaining(["Conflict Resolution", "STAR Method Execution"]));
    expect(tagText("What is the difference between class and functional components in React?").skills).not.toContain("Object-Oriented Programming (OOP)");
  });
});

describe("interview Q&A filtering", () => {
  it("keeps cross-department behavioral questions and any-role questions when filtering", () => {
    expect(applyFilters(bank, { departments: ["Data & Analytics"] }).map((x) => x.id)).toEqual(["b", "c"]);
    expect(applyFilters(bank, { roles: ["Data Analyst"] }).map((x) => x.id)).toEqual(["b", "c"]);
    expect(applyFilters(bank, { tools: ["SQL"] }).map((x) => x.id)).toEqual(["b"]);
    expect(applyFilters(bank, { companies: ["Amazon"] }).map((x) => x.id)).toEqual(["c"]);
    expect(applyFilters(bank, { types: ["Behavioral", "SQL"] }).map((x) => x.id)).toEqual(["b", "c"]);
  });

  it("ranks keyword matches and counts facets", () => {
    expect(applyFilters(bank, { q: "event delegation" }).map((x) => x.id)).toEqual(["a"]);
    expect(score(bank[1], "sql campaigns")).toBeGreaterThan(score(bank[0], "sql campaigns"));
    const f = facets(bank);
    expect(f.total).toBe(3);
    expect(f.tools).toEqual({ SQL: 1 });
    expect(f.companies).toEqual({ Amazon: 1 });
  });

  it("reads repeated and pipe-separated filter params", () => {
    const f = parseFilters(new URLSearchParams("dept=Data%20%26%20Analytics&tool=SQL|Excel&tool=SAP&q=joins"));
    expect(f.departments).toEqual(["Data & Analytics"]);
    expect(f.tools).toEqual(["SQL", "Excel", "SAP"]);
    expect(f.q).toBe("joins");
  });
});

describe("interview Q&A downloads", () => {
  it("flattens markdown answers into blocks, keeping code verbatim", () => {
    const blocks = blocksOf("Use a **CTE**:\n\n```sql\nWITH t AS (\n  SELECT 1\n)\nSELECT * FROM t;\n```\n- First point\n- See [docs](https://example.com)");
    expect(blocks[0]).toEqual({ kind: "text", text: "Use a CTE:" });
    expect(blocks[1]).toEqual({ kind: "code", text: "WITH t AS (\n  SELECT 1\n)\nSELECT * FROM t;" });
    expect(blocks[3]).toEqual({ kind: "bullet", text: "See docs (https://example.com)" });
  });

  it("exports the filtered set as a PDF and a Word file with sources", async () => {
    const pdf = await interviewPdf("Interview Questions & Answers", "3 questions", bank);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThanOrEqual(2);
    const docx = await interviewDocx("Interview Questions & Answers", "3 questions", bank);
    expect(docx.subarray(0, 2).toString()).toBe("PK");
  });
});
