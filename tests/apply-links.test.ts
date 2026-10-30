import { describe, expect, it } from "vitest";
import { applyPlatform, externalSearchLinks } from "@/lib/apply-links";

describe("apply links", () => {
  it("names the platform behind an apply URL", () => {
    expect(applyPlatform("https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Pune/Analyst_R123")).toBe("Workday");
    expect(applyPlatform("https://boards.greenhouse.io/acme/jobs/123")).toBe("Greenhouse");
    expect(applyPlatform("https://www.naukri.com/job-listings-analyst-acme-123")).toBe("Naukri");
    expect(applyPlatform("https://careers.acme.com/jobs/42")).toBe("careers.acme.com");
    expect(applyPlatform("")).toBeNull();
  });

  it("builds LinkedIn, Naukri, Workday and careers searches for Indian roles", () => {
    const links = externalSearchLinks({ title: "Procurement Analyst", company: "Acme", city: "Hyderabad", country: "IN" });
    expect(links.map((l) => l.label)).toEqual(["LinkedIn", "Naukri", "Workday", "Company careers"]);
    expect(links[0].href).toBe("https://www.linkedin.com/jobs/search/?keywords=Procurement%20Analyst%20Acme&location=Hyderabad");
    expect(links[1].href).toBe("https://www.naukri.com/procurement-analyst-jobs-in-hyderabad?k=Procurement%20Analyst&l=Hyderabad");
    expect(decodeURIComponent(links[2].href)).toContain('site:myworkdayjobs.com "Acme"');
  });

  it("skips Naukri outside India and all links for demo listings", () => {
    expect(externalSearchLinks({ title: "Analyst", company: "Acme", country: "DE" }).map((l) => l.label)).not.toContain("Naukri");
    expect(externalSearchLinks({ title: "Analyst", company: "Acme (sample)", source: "demo" })).toEqual([]);
  });
});
