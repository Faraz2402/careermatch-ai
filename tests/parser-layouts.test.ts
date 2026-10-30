import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseResumeHeuristically } from "@/lib/resume/heuristic";

describe("wrapped bullets and merged date lines (PDF extraction)", () => {
  const r = parseResumeHeuristically(fs.readFileSync(path.join(__dirname, "fixtures/wrapped-bullets.txt"), "utf8"));

  it("finds exactly the real roles - wrapped lines never become titles", () => {
    expect(r.experience.map((e) => [e.title, e.company, e.startDate, e.endDate])).toEqual([
      ["Senior Consultant", "Infosys, Hyderabad, India | Client: British Petroleum", "Jul 2026", "Oct 2026"],
      ["Procurement Analyst", "Acme Corp, Dallas, TX", "Feb 2024", "Mar 2026"],
      ["Purchasing Coordinator", "Beta LLC, Austin, TX", "Jul 2023", "Feb 2024"],
    ]);
  });

  it("rejoins wrapped bullet lines into whole highlights", () => {
    expect(r.experience[0].highlights).toHaveLength(3);
    expect(r.experience[0].highlights[2]).toBe("Corrected percentage logic in 6 DAX measures that double-counted rows and removed duplicate records from reports, so dashboard KPIs now match finance numbers.");
    expect(r.experience[1].highlights[1]).toBe("Cut purchase-order approval time from 4.2 to 2.7 days (35%).");
    expect(r.experience[1].highlights[2]).toBe("Automated weekly reporting, raising team productivity by 25%.");
    expect(r.experience[2].highlights[0]).toMatch(/supported 3 supplier reviews\.$/);
    expect(r.experience[2].highlights).toHaveLength(2);
  });
});

describe("dates-first layout", () => {
  const r = parseResumeHeuristically("Pat Doe\n\nExperience\nJan 2020 - Present\nData Analyst\nGlobex\n• Built Tableau dashboards for 40 managers.\nJun 2017 - Dec 2019\nJunior Analyst\nInitech\n• Cleaned CRM data.\n");
  it("reads title and company below the dates", () => {
    expect(r.experience.map((e) => [e.title, e.company, e.highlights.length])).toEqual([
      ["Data Analyst", "Globex", 1],
      ["Junior Analyst", "Initech", 1],
    ]);
  });
});
