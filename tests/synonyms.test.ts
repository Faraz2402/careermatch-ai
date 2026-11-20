import { describe, expect, it } from "vitest";
import { expandTitleTerm, expandTitleTerms, titleMatches } from "@/lib/jobs/synonyms";

describe("expandTitleTerm", () => {
  it("adds equivalent job titles, original first", () => {
    const t = expandTitleTerm("Procurement");
    expect(t[0]).toBe("procurement");
    expect(t).toEqual(expect.arrayContaining(["purchasing", "sourcing", "buyer"]));
  });
  it("keeps the rest of a longer title", () => {
    expect(expandTitleTerm("procurement analyst")).toEqual(expect.arrayContaining(["purchasing analyst", "sourcing analyst"]));
  });
  it("leaves unknown titles alone", () => {
    expect(expandTitleTerm("Actuary")).toEqual(["actuary"]);
  });
  it("matches whole words only", () => {
    expect(expandTitleTerm("chr")).toEqual(["chr"]); // not the "hr" group
    expect(titleMatches("Senior Purchasing Executive", expandTitleTerms(["procurement"]))).toBe(true);
    expect(titleMatches("Sales Manager", expandTitleTerms(["procurement"]))).toBe(false);
    expect(titleMatches("Three-tier support", ["hr"])).toBe(false);
  });
});
