import { describe, expect, it } from "vitest";
import { convertCurrency, currencyForCountry, formatYearly } from "@/lib/geo/currency";
import { scoreJob } from "@/lib/jobs/rank";
import { defaultPreferences, emptyResume, PreferencesSchema, type ResumeData } from "@/lib/resume/schema";

const resume: ResumeData = { ...emptyResume(), name: "A", experience: [{ title: "Senior Procurement Analyst", company: "X", location: "", startDate: "2016", endDate: "Present", highlights: [] }], skills: [{ category: "Tools", skills: ["Excel"] }] };
const job = (title: string, salaryYearlyUsd: number | null = null) => ({ source: "demo", externalId: title, title, company: "Acme", location: "Pune, India", workMode: "onsite" as const, employmentType: "", salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, description: "Excel", url: "", postedAt: new Date(), salaryYearlyUsd });

describe("job preferences", () => {
  it("picks the currency of the location", () => {
    expect([currencyForCountry("IN"), currencyForCountry("AE"), currencyForCountry("DE"), currencyForCountry("ZZ")]).toEqual(["INR", "AED", "EUR", "USD"]);
    expect(Math.round(convertCurrency(2_500_000, "INR", "USD"))).toBe(30_000);
    expect(formatYearly(2_500_000, "INR")).toBe("₹25 LPA");
    expect(formatYearly(12_000_000, "INR")).toBe("₹1.2 Cr a year");
  });

  it("accepts older saved preferences and fills the new fields", () => {
    const old = { ...defaultPreferences(), seniorities: undefined, salaryCurrency: undefined };
    const parsed = PreferencesSchema.parse(old);
    expect(parsed.seniorities).toEqual([]);
    expect(parsed.salaryCurrency).toBe("USD");
  });

  it("scores any chosen seniority level as a fit", () => {
    const prefs = { ...defaultPreferences(), seniorities: ["mid", "lead"] as ("mid" | "lead")[] };
    const lead = scoreJob(job("Lead Procurement Analyst"), resume, prefs);
    const mid = scoreJob(job("Procurement Analyst"), resume, prefs);
    const intern = scoreJob(job("Procurement Intern"), resume, prefs);
    const pts = (m: typeof lead) => m.breakdown.find((b) => /senior/i.test(b.label))!.points;
    expect(pts(lead)).toBe(10);
    expect(pts(mid)).toBe(10);
    expect(pts(intern)).toBeLessThan(10);
  });

  it("compares a rupee salary minimum in USD", () => {
    const prefs = { ...defaultPreferences(), salaryMin: 2_500_000, salaryCurrency: "INR" };
    expect(scoreJob(job("Procurement Analyst", 40_000), resume, prefs).reasons.join(" ")).toMatch(/meets your range/);
    expect(scoreJob(job("Procurement Analyst", 20_000), resume, prefs).concerns.join(" ")).toMatch(/below your minimum/);
  });
});
