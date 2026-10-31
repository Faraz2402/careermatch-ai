import { describe, expect, it } from "vitest";
import { applyPlatform } from "@/lib/apply-links";
import { formatMoney, formatSalary } from "@/lib/format";
import { titleOverlap } from "@/lib/jobs/enrich";
import { buildMatchContext, profileHasSkill, scoreJob } from "@/lib/jobs/rank";
import { defaultPreferences, emptyResume } from "@/lib/resume/schema";

describe("apply links", () => {
  it("names the platform behind an apply URL", () => {
    expect(applyPlatform("https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Pune/Analyst_R123")).toBe("Workday");
    expect(applyPlatform("https://boards.greenhouse.io/acme/jobs/123")).toBe("Greenhouse");
    expect(applyPlatform("https://www.naukri.com/job-listings-analyst-acme-123")).toBe("Naukri");
    expect(applyPlatform("https://careers.acme.com/jobs/42")).toBe("careers.acme.com");
    expect(applyPlatform("")).toBeNull();
  });

  it("only accepts an original posting whose title matches the listing", () => {
    expect(titleOverlap("Senior Business Systems Analyst – Finance Systems Operations", "Sr. Business Systems Analyst, Finance Systems Operations")).toBeGreaterThanOrEqual(0.6);
    expect(titleOverlap("Senior Business Systems Analyst", "Software Engineer II")).toBeLessThan(0.6);
  });
});

describe("job skills vs profile", () => {
  const resume = {
    ...emptyResume(),
    headline: "Procurement Analyst",
    skills: [{ category: "Procurement", skills: ["P2P cycle", "SAP MM", "Power BI (DAX, data modeling)"] }],
    experience: [{ title: "Procurement Analyst", company: "Acme", location: "", startDate: "2019", endDate: "Present", highlights: ["Ran supplier onboarding and vendor master data cleanup"] }],
  };
  const ctx = buildMatchContext(resume, defaultPreferences());

  it("matches skills phrased differently, using the whole profile", () => {
    expect(profileHasSkill("Procure-to-Pay (P2P)", ctx)).toBe(true);
    expect(profileHasSkill("DAX", ctx)).toBe(true);
    expect(profileHasSkill("Vendor master data", ctx)).toBe(true);
    expect(profileHasSkill("SAP S/4HANA Finance", ctx)).toBe(false);
  });

  it("lists every required skill as matched or missing, and 1 of 1 isn't a perfect score", () => {
    const job = {
      source: "adzuna", externalId: "1", title: "Procurement Analyst", company: "X", location: "Pune", workMode: "onsite" as const, employmentType: "",
      salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, description: "P2P support role.", url: "", postedAt: new Date(),
    };
    const one = scoreJob(job, ctx);
    expect(one.breakdown[0].points).toBeLessThan(40);

    const withReqs = scoreJob({ ...job, requirements: { skills: ["Procure-to-Pay (P2P)", "SAP MM", "SOX controls"], niceToHave: ["Coupa"], minYears: 3, education: "", responsibilities: [] } }, ctx);
    expect(withReqs.skillsFrom).toBe("requirements");
    expect(withReqs.matched).toEqual(["Procure-to-Pay (P2P)", "SAP MM"]);
    expect(withReqs.missing).toEqual(["SOX controls", "Coupa"]);
    expect(withReqs.concerns.join(" ")).toContain("SOX controls");
    expect(withReqs.breakdown.every((b) => b.detail.length > 0)).toBe(true);
  });
});

describe("money formatting", () => {
  it("shows Indian salaries in lakhs per annum", () => {
    expect(formatMoney(1_800_000, "INR", "year")).toBe("₹18 LPA");
    expect(formatMoney(65_000, "INR", "month")).toBe("₹65,000/mo");
    expect(formatSalary({ salaryMin: 1_200_000, salaryMax: 1_850_000, salaryCurrency: "INR", salaryPeriod: "year" })).toBe("₹12–18.5 LPA");
    expect(formatMoney(120_000, "USD", "year")).toBe("$120k/yr");
  });
});
