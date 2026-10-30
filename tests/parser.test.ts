import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { isLinkedInExport, parseResumeHeuristically } from "@/lib/resume/heuristic";

describe("heuristic resume parser", () => {
  const r = parseResumeHeuristically(DEMO_RESUME_TEXT);

  it("extracts contact details", () => {
    expect(r.name).toBe("Jordan Rivera");
    expect(r.headline).toBe("Senior Full-Stack Engineer");
    expect(r.email).toBe("jordan.rivera@example.com");
    expect(r.phone).toBe("(512) 555-0142");
    expect(r.location).toBe("Austin, TX");
  });

  it("splits roles with dates and highlights", () => {
    expect(r.experience.map((e) => [e.title, e.company])).toEqual([
      ["Senior Software Engineer", "Brightwave Health"],
      ["Software Engineer", "Loopline Commerce"],
      ["Junior Developer", "Cedar Labs"],
    ]);
    expect(r.experience[0].endDate).toBe("Present");
    expect(r.experience[0].highlights).toHaveLength(4);
  });

  it("groups skills and finds links", () => {
    const skills = r.skills.flatMap((g) => g.skills);
    expect(skills).toEqual(expect.arrayContaining(["TypeScript", "React", "AWS", "PostgreSQL"]));
    expect(r.links.map((l) => l.label)).toEqual(expect.arrayContaining(["LinkedIn", "GitHub"]));
  });
});

describe("LinkedIn 'Save to PDF' export", () => {
  const text = fs.readFileSync(path.join(__dirname, "fixtures/linkedin-export.txt"), "utf8");
  const r = parseResumeHeuristically(text);

  it("is detected", () => expect(isLinkedInExport(text)).toBe(true));
  it("finds name and headline after the sidebar", () => {
    expect(r.name).toBe("Sam Lee");
    expect(r.headline).toBe("Frontend Engineer at Example Corp");
    expect(r.email).toBe("sam.lee@example.com");
  });
  it("reads company-above-title roles and prose descriptions", () => {
    expect(r.experience.map((e) => [e.title, e.company, e.startDate, e.endDate])).toEqual([
      ["Frontend Engineer", "Example Corp", "March 2021", "Present"],
      ["Software Engineer", "Sample Startup", "June 2018", "February 2021"],
    ]);
    expect(r.experience[0].highlights[0]).toMatch(/design system/);
  });
  it("keeps the top skills", () => {
    expect(r.skills.flatMap((g) => g.skills)).toEqual(expect.arrayContaining(["React", "TypeScript", "GraphQL"]));
  });
});
