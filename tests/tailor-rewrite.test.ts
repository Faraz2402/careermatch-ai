import { describe, expect, it } from "vitest";
import { emptyResume, type ResumeData } from "@/lib/resume/schema";
import { matchAll } from "@/lib/tailor/evidence";
import { checkProposal } from "@/lib/tailor/guard";
import { ruleBasedLetter } from "@/lib/tailor/letter";
import { analyseWithRules } from "@/lib/tailor/requirements";
import { applyChanges, changesFromAi, keepsBaseSkills, resumeText, ruleBasedActions, ruleBasedChanges } from "@/lib/tailor/rewrite";

const JD = `Procurement Analyst
Responsibilities:
- Run spend analysis and present savings opportunities to stakeholders
- Manage RFQ events and vendor onboarding
Requirements:
- Procure-to-Pay (P2P) process knowledge
- Power BI dashboards
- Stakeholder management
Nice to have:
- Coupa`;

const resume: ResumeData = {
  ...emptyResume(),
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "+91 90000 00000",
  headline: "Analyst",
  summary: "Analyst with five years in purchasing teams, building reports and supporting buyers.",
  skills: [{ category: "Tools", skills: ["Excel", "Power BI"] }],
  experience: [
    { title: "Procurement Analyst", company: "Acme", location: "Pune", startDate: "Jan 2021", endDate: "Present", highlights: ["Responsible for P2P exception reviews with finance", "Worked on Power BI spend dashboards for 1,200 suppliers", "Helped buyers with RFQ events"] },
  ],
};

const analysis = analyseWithRules({ title: "Procurement Analyst", company: "Acme", description: JD });
const matches = matchAll(analysis.requirements, resume);
const ctx = { resumeText: resumeText(resume), allowed: [] as string[] };

describe("truthfulness guard", () => {
  it("rejects invented numbers and unconfirmed skills", () => {
    expect(checkProposal("Ran RFQ events", "Ran 40 RFQ events saving 12%", ctx).join(" ")).toMatch(/figures.*40.*12/);
    expect(checkProposal("Ran RFQ events", "Ran RFQ events in Coupa", ctx).join(" ")).toMatch(/Coupa/);
    expect(checkProposal("Ran RFQ events", "Ran RFQ events in Coupa", { ...ctx, allowed: ["Coupa"] })).toEqual([]);
    expect(checkProposal("Worked on Power BI dashboards for 1,200 suppliers", "Built Power BI spend dashboards covering 1,200 suppliers", ctx)).toEqual([]);
    // "Mentored" on the résumé already evidences leadership.
    const mentor = { resumeText: "Mentored 3 junior engineers through code reviews", allowed: [] };
    expect(checkProposal("Mentored 3 junior engineers", "Showed leadership by mentoring 3 junior engineers", mentor)).toEqual([]);
  });

  it("drops unsafe AI proposals and explains why", () => {
    const { changes, dropped } = changesFromAi(resume, {
      headline: { proposed: "Procurement Analyst", reason: "match title" },
      summary: { proposed: "Procurement analyst who saved 30% on indirect spend.", reason: "x", keywords: [] },
      bullets: [
        { exp: 0, bullet: 0, proposed: "Led Procure-to-Pay (P2P) exception reviews with finance", reason: "job term", keywords: ["Procure-to-Pay (P2P)"] },
        { exp: 0, bullet: 2, proposed: "Ran RFQ events in Coupa", reason: "x", keywords: ["Coupa"] },
      ],
      actions: [],
    }, ctx);
    expect(changes.map((c) => c.section)).toEqual(["headline", "experience"]);
    expect(dropped).toHaveLength(2);
  });
});

describe("rule-based tailoring (no AI)", () => {
  const changes = ruleBasedChanges(resume, analysis, matches, ctx);

  it("actually rewrites bullets instead of repeating them", () => {
    const bullets = changes.filter((c) => c.section === "experience");
    expect(bullets.length).toBe(3);
    expect(bullets.every((c) => c.proposed !== c.original)).toBe(true);
    expect(bullets[0].proposed).toBe("Owned Procure-to-Pay (P2P) exception reviews with finance");
    expect(bullets[1].proposed).toMatch(/^Delivered Power BI spend dashboards for 1,200 suppliers/);
    expect(bullets[0].reason).toMatch(/stronger action verb.*Procure-to-Pay/);
  });

  it("targets the headline and summary without new claims", () => {
    expect(changes.find((c) => c.section === "headline")?.proposed).toMatch(/^Procurement Analyst/);
    const summary = changes.find((c) => c.section === "summary")!;
    expect(summary.proposed).toContain(resume.summary);
    expect(checkProposal(resume.summary, summary.proposed, ctx)).toEqual([]);
  });

  it("applies only accepted changes and keeps every base skill", () => {
    const accepted = changes.map((c, i) => ({ ...c, status: i % 2 ? ("rejected" as const) : ("accepted" as const) }));
    const coupa = analysis.requirements.find((r) => r.keyword === "Coupa")!.keyword;
    const out = applyChanges(resume, accepted, { selected: [], learning: [coupa], matches });
    expect(keepsBaseSkills(resume, out)).toBe(true);
    expect(out.skills.at(-1)).toEqual({ category: "Currently learning", skills: ["Coupa"] });
    expect(out.experience[0].title).toBe("Procurement Analyst");
    expect(out.experience[0].startDate).toBe("Jan 2021");
    const rejected = accepted.find((c) => c.status === "rejected" && c.section === "experience");
    if (rejected) expect(out.experience[0].highlights[rejected.ref!.bullet!]).toBe(rejected.original);
  });

  it("gives a prioritised action plan", () => {
    const plan = ruleBasedActions(resume, matches);
    expect(plan[0].priority).toBe("required");
    expect(plan.map((p) => p.title).join(" ")).toMatch(/Stakeholder management/);
  });

  it("writes a letter from résumé evidence only", () => {
    const letter = ruleBasedLetter(resume, analysis, matches, "confident", "standard");
    const text = letter.paragraphs.join(" ");
    expect(letter.greeting).toBe("Dear Acme hiring team,");
    expect(text).toContain("Procurement Analyst");
    expect(checkProposal(resumeText(resume), text, ctx)).toEqual([]);
    expect(text).not.toMatch(/Coupa/);
  });
});
