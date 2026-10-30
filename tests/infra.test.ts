import { describe, expect, it } from "vitest";
import { seal, sealJson, unseal, unsealJson } from "@/lib/crypto";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { closestOriginal, wordDiff } from "@/lib/diff";
import { renderDocx, renderPdf, resumeDocFromProfile, TEMPLATES } from "@/lib/export/documents";
import { isPrivateAddress } from "@/lib/jobs/import-url";
import { templateInterviewTurn } from "@/lib/interview";
import { rateLimit } from "@/lib/rate-limit";
import { parseResumeHeuristically } from "@/lib/resume/heuristic";
import { defaultVisibility, redactForPublic } from "@/lib/resume/schema";

const resume = parseResumeHeuristically(DEMO_RESUME_TEXT);

describe("encryption at rest", () => {
  it("round-trips and produces different ciphertexts", () => {
    const a = seal("secret resume"), b = seal("secret resume");
    expect(a).not.toBe(b);
    expect(a.startsWith("enc:v1:")).toBe(true);
    expect(unseal(a)).toBe("secret resume");
    expect(unsealJson(sealJson({ x: 1 }), null)).toEqual({ x: 1 });
  });
  it("reads legacy plaintext and rejects tampering", () => {
    expect(unseal('{"legacy":true}')).toBe('{"legacy":true}');
    const t = seal("hello");
    const tampered = t.slice(0, -4) + (t.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => unseal(tampered)).toThrow();
    expect(unsealJson(tampered, "fallback")).toBe("fallback");
  });
});

describe("public profile redaction", () => {
  it("removes hidden fields before rendering", () => {
    const r = redactForPublic(resume, { ...defaultVisibility(), showEmail: false, showPhone: false, showExperience: false });
    expect(r.email).toBe("");
    expect(r.phone).toBe("");
    expect(r.experience).toEqual([]);
    expect(r.name).toBe(resume.name);
  });
});

describe("document export", () => {
  const doc = resumeDocFromProfile({ ...resume, summary: resume.summary + " Emoji 🚀 and arrows →." });
  for (const t of TEMPLATES) {
    it(`renders a valid PDF (${t})`, async () => {
      const pdf = await renderPdf(doc, t);
      expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(1500);
    });
    it(`renders a valid DOCX (${t})`, async () => {
      const docx = await renderDocx(doc, t);
      expect(docx[0]).toBe(0x50); // zip "PK"
      expect(docx[1]).toBe(0x4b);
    });
  }
  it("renders a cover letter", async () => {
    const pdf = await renderPdf({ kind: "letter", name: "Jordan Rivera", contact: ["a@b.co"], subject: "Hello", body: "Para one.\n\nPara two." }, "classic");
    expect(pdf.length).toBeGreaterThan(800);
  });
});

describe("word diff", () => {
  it("marks insertions and deletions", () => {
    const parts = wordDiff("Built dashboards in Python", "Built analytics dashboards in Python and SQL");
    expect(parts.filter((p) => p.type === "add").map((p) => p.text.trim()).join(" ")).toContain("analytics");
    expect(parts.filter((p) => p.type === "del")).toHaveLength(0);
  });
  it("finds the closest original bullet", () => {
    expect(closestOriginal("Led a team of 5 engineers building React apps", resume.experience[0].highlights)).toMatch(/^Led a team/);
    expect(closestOriginal("Something unrelated entirely", resume.experience[0].highlights)).toBeNull();
  });
});

describe("SSRF guard", () => {
  it("blocks private and loopback addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.5", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip)).toBe(true);
    for (const ip of ["8.8.8.8", "104.16.1.1", "2606:4700::1111"]) expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe("rate limiter (memory)", () => {
  it("allows up to the limit then blocks", async () => {
    const key = `t-${Math.random()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rateLimit(key, 3, 60_000)).ok);
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("template mock interview", () => {
  const job = { source: "t", externalId: "1", title: "Frontend Engineer", company: "Acme", location: "Remote", workMode: "remote" as const, employmentType: "", salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, description: "React, TypeScript, Playwright", url: "", postedAt: new Date() };
  it("asks, gives feedback, and completes after five answers", () => {
    expect(templateInterviewTurn(resume, job, [])).toMatch(/Question 1/);
    const msgs: { role: string; content: string }[] = [];
    let reply = "";
    for (let i = 0; i < 5; i++) {
      msgs.push({ role: "assistant", content: "q" }, { role: "user", content: "In that situation I improved load time by 38% for 2M users, the result was great." });
      reply = templateInterviewTurn(resume, job, msgs);
    }
    expect(reply).toMatch(/Interview complete/);
    expect(reply).toMatch(/Feedback/);
  });
});
