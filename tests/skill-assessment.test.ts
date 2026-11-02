import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { AssessmentRequest, assessmentPrompt, ASSESSMENT_SYSTEM, finalizeAssessment, googleAssessmentPrompt, parsePastedAssessment, scoreAssessment, shuffle, validateItems, type McqItem } from "@/lib/interview-qa/assessment";
import { assessmentDocx, assessmentPdf, assessmentPdfUnsupported } from "@/lib/interview-qa/assessment-export";

const item = (over: Partial<McqItem> = {}): McqItem => ({
  difficulty: "Intermediate",
  question: "A pod is in CrashLoopBackOff. What do you check first?",
  options: ["Previous container logs", "Node pool size", "Ingress rules", "DNS TTL"],
  correct_answer: "Previous container logs",
  explanation: "The previous container's logs show why it exited.",
  ...over,
});

/** Deterministic PRNG so shuffles are reproducible. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

describe("skill assessment validation", () => {
  it("keeps well-formed items", () => {
    expect(validateItems([item()])).toHaveLength(1);
  });

  it("drops items whose correct answer is not exactly one option", () => {
    expect(validateItems([item({ correct_answer: "Container logs" })])).toHaveLength(0);
    expect(validateItems([item({ options: ["A", "A", "B", "C"], correct_answer: "A" })])).toHaveLength(0);
  });

  it("drops items without 4 distinct options", () => {
    expect(validateItems([item({ options: ["Previous container logs", "Node pool size", "Ingress rules"] })])).toHaveLength(0);
    expect(validateItems([item({ options: ["Previous container logs", "Node pool size", "Ingress rules", "DNS TTL", "Extra"] })])).toHaveLength(0);
    expect(validateItems([item({ options: ["Previous container logs", "node pool size", "Node pool size", "DNS TTL"] })])).toHaveLength(0);
    expect(validateItems([item({ options: ["Previous container logs", "", "Ingress rules", "DNS TTL"] })])).toHaveLength(0);
  });

  it("drops 'all of the above' / 'none of the above' style options", () => {
    for (const bad of ["All of the above", "None of the above", "Both A and B", "Ninguna de las anteriores"])
      expect(validateItems([item({ options: ["Previous container logs", "Node pool size", "Ingress rules", bad] })])).toHaveLength(0);
  });

  it("drops unknown difficulties and duplicate questions, and normalises whitespace", () => {
    expect(validateItems([item({ difficulty: "Expert" as never })])).toHaveLength(0);
    expect(validateItems([item(), item()])).toHaveLength(1);
    const [v] = validateItems([item({ options: ["  Previous   container logs ", "Node pool size", "Ingress rules", "DNS TTL"], correct_answer: "Previous container logs" })]);
    expect(v.options[0]).toBe("Previous container logs");
  });
});

describe("skill assessment shuffle and finalize", () => {
  it("shuffle is a permutation and does not mutate", () => {
    const xs = [1, 2, 3, 4, 5, 6];
    const out = shuffle(xs, seeded(7));
    expect([...out].sort()).toEqual(xs);
    expect(xs).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("moves the correct answer around across items", () => {
    const items = Array.from({ length: 40 }, (_, i) => item({ question: `Question ${i}` }));
    const out = finalizeAssessment(items, 40, seeded(42));
    const positions = new Set(out.map((it) => it.options.indexOf(it.correct_answer)));
    expect(positions.size).toBeGreaterThan(1);
    for (const it of out) expect(it.options).toContain(it.correct_answer);
  });

  it("trims to the requested count and orders easy to hard", () => {
    const items = [item({ question: "q1", difficulty: "Advanced" }), item({ question: "q2", difficulty: "Beginner" }), item({ question: "q3", difficulty: "Intermediate" }), item({ question: "q4", difficulty: "Beginner" })];
    const out = finalizeAssessment(items, 3);
    expect(out.map((x) => x.question)).toEqual(["q2", "q3", "q1"]);
  });

  it("scores answers with a per-difficulty breakdown", () => {
    const items = [item({ question: "a", difficulty: "Beginner" }), item({ question: "b", difficulty: "Advanced" }), item({ question: "c", difficulty: "Advanced" })];
    const s = scoreAssessment(items, ["Previous container logs", "DNS TTL", null]);
    expect(s).toMatchObject({ correct: 1, total: 3, percent: 33 });
    expect(s.by.Beginner).toEqual({ correct: 1, total: 1 });
    expect(s.by.Advanced).toEqual({ correct: 0, total: 2 });
  });
});

describe("skill assessment request and prompt", () => {
  it("validates the request body", () => {
    expect(AssessmentRequest.safeParse({ skill: "Rust", locale: "pt-BR", difficulty: "Mixed", count: 10 }).success).toBe(true);
    expect(AssessmentRequest.safeParse({ skill: "Rust", locale: "pt-BR", difficulty: "Mixed", count: 7 }).success).toBe(false);
    expect(AssessmentRequest.safeParse({ skill: "R", locale: "pt-BR", difficulty: "Mixed", count: 5 }).success).toBe(false);
    expect(AssessmentRequest.safeParse({ skill: "Rust", locale: "pt-BR", difficulty: "Expert", count: 5 }).success).toBe(false);
  });

  it("asks for a localized test and forbids vendor claims", () => {
    const p = assessmentPrompt({ skill: "Six Sigma", locale: "fr-CA", difficulty: "Advanced", count: 5 });
    expect(p).toContain("Six Sigma");
    expect(p).toContain("French (Canada)");
    expect(p).toContain("Advanced");
    expect(ASSESSMENT_SYSTEM).toMatch(/All of the above/);
    expect(ASSESSMENT_SYSTEM).toMatch(/localize/i);
    expect(ASSESSMENT_SYSTEM).toMatch(/Never claim/);
  });
});

describe("skill assessment export", () => {
  const doc = { skill: "Kubernetes", language: "English (United States)", items: [item(), item({ question: "Which object exposes pods on a stable IP?", options: ["Service", "ConfigMap", "Secret", "Job"], correct_answer: "Service", difficulty: "Beginner" })], answers: ["Previous container logs", "Job"] };

  it("builds a PDF with every question", async () => {
    const bytes = await assessmentPdf(doc);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(pdf.getTitle()).toContain("Kubernetes");
  });

  it("builds a Word document containing questions, answers and explanations", async () => {
    const buf = await assessmentDocx(doc);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const { default: JSZip } = await import("jszip");
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).toContain("Which object exposes pods on a stable IP?");
    expect(xml).toContain("Answer: ");
    expect(xml).toContain("The previous container");
    expect(xml).toContain("Score 1/2 (50%)");
  });

  it("flags scripts the standard PDF fonts cannot show", () => {
    expect(assessmentPdfUnsupported(doc)).toBe(false);
    expect(assessmentPdfUnsupported({ ...doc, items: [item({ question: "कुबेरनेट्स में पॉड क्या है?", options: ["एक", "दो", "तीन", "चार"], correct_answer: "एक", explanation: "पॉड सबसे छोटी इकाई है।" })] })).toBe(true);
  });
});

describe("Google AI Mode hand-off", () => {
  it("builds a short prompt that fits in a URL", () => {
    const p = googleAssessmentPrompt({ skill: "Clinical Nursing Logistics", locale: "pt-BR", difficulty: "Mixed", count: 20 });
    expect(p).toContain("Clinical Nursing Logistics");
    expect(p).toContain("pt-BR");
    expect(p).toContain('"correct_answer"');
    expect(encodeURIComponent(p).length).toBeLessThan(1800);
  });

  const good = (i: number) => ({ difficulty: "Beginner", question: `Question ${i}?`, options: ["Alpha", "Beta", "Gamma", "Delta"], correct_answer: "Beta", explanation: "Because." });

  it("parses a fenced JSON answer with surrounding text", () => {
    const text = `Here is your assessment:\n\n\`\`\`json\n${JSON.stringify({ questions: [good(1), good(2), good(3)] }, null, 2)}\n\`\`\`\nGood luck!`;
    const out = parsePastedAssessment(text, 10);
    expect(out).toHaveLength(3);
    for (const q of out) expect(q.options).toContain("Beta");
  });

  it("accepts a bare array, trailing commas, letter answers and other key names", () => {
    const text = `[{"level":"Advanced","question":"Q1?","choices":["A. Red","B. Blue","C. Green","D. Pink"],"answer":"C","rationale":"Green.",},]`;
    const [q] = parsePastedAssessment(text, 5);
    expect(q).toMatchObject({ difficulty: "Advanced", correct_answer: "Green", explanation: "Green." });
    expect(q.options.sort()).toEqual(["Blue", "Green", "Pink", "Red"]);
  });

  it("falls back to a plain-text test format", () => {
    const text = `1. Which port does HTTPS use by default?\nA) 21\nB) 80\nC) 443\nD) 8080\nAnswer: C\nExplanation: HTTPS defaults to 443.\n\n2. [Beginner] Which command lists files on Linux?\nA) ls\nB) cd\nC) rm\nD) mv\nAnswer: A\nExplanation: ls lists directory contents.`;
    const out = parsePastedAssessment(text, 5);
    expect(out).toHaveLength(2);
    expect(out.map((q) => q.correct_answer).sort()).toEqual(["443", "ls"]);
    expect(out[0].difficulty).toBe("Beginner");
  });

  it("still applies the quality checks and returns nothing for junk", () => {
    expect(parsePastedAssessment(JSON.stringify({ questions: [{ ...good(1), options: ["Alpha", "Beta", "Gamma", "All of the above"] }] }), 5)).toHaveLength(0);
    expect(parsePastedAssessment("Sorry, I can't help with that.", 5)).toHaveLength(0);
    expect(parsePastedAssessment("", 5)).toHaveLength(0);
  });
});
