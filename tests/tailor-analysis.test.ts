import { describe, expect, it } from "vitest";
import { emptyResume, type ResumeData } from "@/lib/resume/schema";
import { matchAll } from "@/lib/tailor/evidence";
import { analyseWithRules, mergeAiAnalysis } from "@/lib/tailor/requirements";
import { explainChange, scoreResume, SCORE_METHOD } from "@/lib/tailor/score";

const JD = `Procurement Analyst
About the role
We are hiring a Procurement Analyst for our Bengaluru team.
Responsibilities:
- Run spend analysis across indirect categories and present savings opportunities to stakeholders
- Manage RFQ and RFP events and support contract negotiation
- Maintain vendor master data in SAP S/4HANA
Requirements:
- 3+ years in procurement with Procure-to-Pay (P2P) experience
- Advanced Excel and Power BI
- Strong stakeholder management and communication
Nice to have:
- Coupa or SAP Ariba
- Lean Six Sigma certification`;

const resume: ResumeData = {
  ...emptyResume(),
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "+91 90000 00000",
  headline: "Procurement Analyst",
  summary: "Procurement analyst focused on spend analysis and supplier management.",
  skills: [{ category: "Tools", skills: ["Excel (advanced)", "Power BI", "SAP Ariba"] }],
  experience: [
    { title: "Procurement Analyst", company: "Acme", location: "Pune", startDate: "Jan 2021", endDate: "Present", highlights: ["Built Power BI spend dashboards covering 1,200 suppliers", "Ran P2P exception reviews with finance, cutting invoice holds by 18%", "Supported RFQ events for packaging and logistics categories"] },
  ],
  education: [{ school: "Pune University", degree: "B.Com", field: "Commerce", startDate: "2016", endDate: "2019", details: "" }],
};

describe("job description analysis", () => {
  const a = analyseWithRules({ title: "Procurement Analyst", company: "Acme", description: JD });
  const byKey = Object.fromEntries(a.requirements.map((r) => [r.keyword, r]));

  it("finds requirements by section and tells essential from preferred", () => {
    expect(byKey["Procure-to-Pay (P2P)"]).toMatchObject({ essential: true, group: "domain" });
    expect(byKey["Power BI"]).toMatchObject({ essential: true, group: "tools" });
    expect(byKey["Coupa"]).toMatchObject({ essential: false });
    expect(byKey["Lean Six Sigma"]).toMatchObject({ essential: false });
    expect(byKey["Stakeholder management"]).toMatchObject({ group: "behavioural" });
    expect(a.responsibilities).toHaveLength(3);
  });

  it("classifies evidence: exact, equivalent, skills-only and missing", () => {
    const m = Object.fromEntries(matchAll(a.requirements, resume).map((x) => [x.requirement.keyword, x]));
    expect(m["Power BI"]).toMatchObject({ status: "exact", inContext: true, confidence: "high" });
    // The posting itself uses "P2P", so the résumé's "P2P" is an exact match.
    expect(m["Procure-to-Pay (P2P)"]).toMatchObject({ status: "exact", inContext: true });
    expect(m["Procure-to-Pay (P2P)"].evidence[0].text).toContain("P2P exception reviews");
    // When the posting only spells it out, the acronym is equivalent wording.
    const spelled = matchAll([{ id: "x", phrase: "Strong procure-to-pay knowledge", keyword: "Procure-to-Pay (P2P)", group: "domain", essential: true, mentions: 1 }], resume)[0];
    expect(spelled).toMatchObject({ status: "equivalent", inContext: true });
    expect(spelled.suggestion.wording).toBe("Procure-to-Pay");
    expect(m["SAP Ariba"]).toMatchObject({ status: "exact", inContext: false, action: "strengthen" });
    expect(m["Coupa"]).toMatchObject({ status: "missing", action: "learning" });
    expect(m["Stakeholder management"].status).toBe("missing");
  });

  it("drops AI keywords that aren't in the posting", () => {
    const merged = mergeAiAnalysis({ title: "Procurement Analyst", company: "Acme", description: JD }, {
      seniority: "Mid-level",
      responsibilities: ["Run spend analysis"],
      requirements: [
        { phrase: "Advanced Excel", keyword: "Microsoft Excel", group: "tools", essential: true },
        { phrase: "Kubernetes clusters", keyword: "Kubernetes", group: "tools", essential: true },
      ],
    }, "test");
    expect(merged.requirements.map((r) => r.keyword)).toContain("Microsoft Excel");
    expect(merged.requirements.map((r) => r.keyword)).not.toContain("Kubernetes");
    expect(merged.method).toBe("ai");
  });
});

describe("Estimated ATS Alignment", () => {
  const a = analyseWithRules({ title: "Procurement Analyst", company: "Acme", description: JD });

  it("weights categories transparently and stays between 0 and 100", () => {
    const s = scoreResume(resume, a);
    expect(s.method).toBe(SCORE_METHOD);
    expect(s.categories.map((c) => c.weight)).toEqual([40, 15, 20, 15, 10]);
    expect(s.total).toBeGreaterThan(20);
    expect(s.total).toBeLessThanOrEqual(100);
    expect(s.gaps).toContain("Coupa");
  });

  it("gives less credit to a skills-list-only keyword than one used in experience", () => {
    const listed = { ...resume, skills: [...resume.skills, { category: "Process", skills: ["Stakeholder management"] }] };
    const inContext = { ...resume, experience: [{ ...resume.experience[0], highlights: [...resume.experience[0].highlights, "Led stakeholder management for the quarterly business reviews"] }] };
    const base = scoreResume(resume, a).total;
    const l = scoreResume(listed, a).total;
    const c = scoreResume(inContext, a).total;
    expect(l).toBeGreaterThan(base);
    expect(c).toBeGreaterThan(l);
    expect(explainChange(scoreResume(resume, a), scoreResume(inContext, a)).join(" ")).toMatch(/Newly covered: .*Stakeholder management/);
  });

  it("penalises a visual layout only in the parsing category", () => {
    const ats = scoreResume(resume, a);
    const visual = scoreResume(resume, a, { visual: true });
    expect(ats.total - visual.total).toBeGreaterThan(0);
    expect(visual.warnings.join(" ")).toMatch(/ATS-first/);
  });
});
