import { describe, expect, it } from "vitest";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { buildMatchContext, detectSeniority, familiesOf, inferSeniority, scoreJob } from "@/lib/jobs/rank";
import { normalizeSalaryYearlyUsd, salaryInsight } from "@/lib/jobs/salary";
import type { NormalizedJob } from "@/lib/jobs/types";
import { parseResumeHeuristically } from "@/lib/resume/heuristic";
import { defaultPreferences } from "@/lib/resume/schema";
import { extractSkills } from "@/lib/skills";

const resume = parseResumeHeuristically(DEMO_RESUME_TEXT);
const prefs = { ...defaultPreferences(), roles: ["Senior Frontend Engineer"], seniority: "senior" as const, workModes: ["remote" as const] };

const job = (over: Partial<NormalizedJob>): NormalizedJob => ({
  source: "test", externalId: "1", title: "Software Engineer", company: "Acme", location: "Remote", workMode: "remote",
  employmentType: "full-time", salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null,
  description: "", url: "", postedAt: new Date(), ...over,
});

describe("skills vocabulary", () => {
  it("handles symbols and avoids prose false positives", () => {
    const names = extractSkills("We use C#, C++ and Node.js. Go-to-market experience helps.").map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["C#", "C++", "Node.js"]));
    expect(names).not.toContain("Go");
    expect(names).not.toContain("JavaScript"); // "js" inside Node.js
  });
});

describe("seniority", () => {
  it("detects from titles", () => {
    expect(detectSeniority("Staff Software Engineer")).toBe("lead");
    expect(detectSeniority("Sr. Developer")).toBe("senior");
    expect(detectSeniority("Junior Web Developer")).toBe("junior");
  });
  it("prefers the explicit title over years of experience", () => expect(inferSeniority(resume)).toBe("senior"));
});

describe("scoreJob", () => {
  const ctx = buildMatchContext(resume, prefs);

  it("treats equivalent role titles as a match (role families)", () => {
    expect(familiesOf("UI Engineer")).toContain("frontend");
    const m = scoreJob(job({ title: "Senior UI Engineer", description: "React and TypeScript." }), ctx);
    expect(m.reasons.some((r) => r.includes("frontend"))).toBe(true);
    expect(m.breakdown.find((b) => b.label === "Role / title")!.points).toBeGreaterThanOrEqual(16);
  });

  it("ranks a relevant job above an unrelated one", () => {
    const good = scoreJob(job({ title: "Senior Frontend Engineer", description: "React, TypeScript, GraphQL, Next.js, Jest, AWS." }), ctx);
    const bad = scoreJob(job({ title: "Registered Nurse", description: "Patient care in a hospital ward, night shifts.", workMode: "onsite", location: "Boston, MA" }), ctx);
    expect(good.score).toBeGreaterThan(70);
    expect(bad.score).toBeLessThan(45);
    expect(good.score).toBeLessThanOrEqual(100);
  });

  it("reports matched and missing skills", () => {
    const m = scoreJob(job({ description: "Must know React, Rust and Kubernetes." }), ctx);
    expect(m.matched).toEqual(expect.arrayContaining(["React", "Kubernetes"]));
    expect(m.missing).toContain("Rust");
  });

  it("learns from saved and hidden jobs", () => {
    const base = job({ title: "Backend Engineer", description: "Python services." });
    const neutral = scoreJob(base, ctx).score;
    const liked = scoreJob(base, buildMatchContext(resume, prefs, { feedback: { liked: [{ title: "Backend Engineer", company: "X" }], disliked: [] } }));
    const hidden = scoreJob(base, buildMatchContext(resume, prefs, { feedback: { liked: [], disliked: [{ title: "Backend Engineer", company: "Acme" }] } }));
    expect(liked.score).toBeGreaterThan(neutral);
    expect(hidden.score).toBeLessThan(neutral);
    expect(hidden.concerns).toContain("Similar to jobs you've hidden.");
  });

  it("flags stale or undated listings", () => {
    expect(scoreJob(job({ postedAt: null }), ctx).stale).toBe(true);
    expect(scoreJob(job({ postedAt: new Date(Date.now() - 45 * 86_400_000) }), ctx).stale).toBe(true);
    expect(scoreJob(job({}), ctx).stale).toBe(false);
  });
});

describe("salary normalisation", () => {
  it("converts periods and currencies to yearly USD", () => {
    expect(normalizeSalaryYearlyUsd({ salaryMin: 100_000, salaryMax: 140_000, salaryCurrency: "USD", salaryPeriod: "year" })).toBe(120_000);
    expect(normalizeSalaryYearlyUsd({ salaryMin: 50, salaryMax: 50, salaryCurrency: "USD", salaryPeriod: "hour" })).toBe(104_000);
    expect(normalizeSalaryYearlyUsd({ salaryMin: 5000, salaryMax: 5000, salaryCurrency: "EUR", salaryPeriod: "month" })).toBe(64_800);
    expect(normalizeSalaryYearlyUsd({ salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null })).toBeNull();
    expect(normalizeSalaryYearlyUsd({ salaryMin: 120, salaryMax: 150, salaryCurrency: "USD", salaryPeriod: "year" })).toBeNull(); // nonsense units
  });
  it("computes percentiles with enough data", () => {
    expect(salaryInsight([1, 2, 3], 2)).toBeNull();
    const i = salaryInsight([100, 110, 120, 130, 140, 150, 160].map((k) => k * 1000), 145_000)!;
    expect(i.median).toBe(130_000);
    expect(i.percentile).toBe(71);
  });
});
