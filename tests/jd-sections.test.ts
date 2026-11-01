import { describe, expect, it } from "vitest";
import { sectionLines } from "@/lib/tailor/requirements";

const sections = (jd: string) => sectionLines(jd).map((l) => `${l.section}: ${l.line}`);

describe("job description sections", () => {
  it("reads headings written with straight or curly apostrophes", () => {
    expect(sections("What you'll need:\n- 5 years of Excel\nWhat you’ll do:\n- Run audits")).toEqual([
      "essential: 5 years of Excel",
      "responsibilities: Run audits",
    ]);
  });

  it("skips boilerplate sections and notices", () => {
    const jd = [
      "About Us:",
      "We are a fast-growing fintech.",
      "Requirements:",
      "- SAP Ariba",
      "Please note: we never ask for payment.",
      "Benefits:",
      "- Health insurance",
      "Equal Opportunity Employer:",
      "We welcome all applicants.",
    ].join("\n");
    expect(sections(jd)).toEqual(["essential: SAP Ariba"]);
  });
});
