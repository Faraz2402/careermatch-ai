import { describe, expect, it } from "vitest";
import { robotsRuleMatches } from "@/lib/jobs/util";
import { expiryCutoff } from "@/lib/jobs/service";

describe("robots.txt rules", () => {
  it("treats * as a wildcard instead of blocking the whole site", () => {
    // jobs-ups.com: "Disallow: */apply" must not block job pages
    expect(robotsRuleMatches("*/apply", "/imea/en/job/R25000613/Senior-Business-Analyst")).toBe(false);
    expect(robotsRuleMatches("*/apply", "/imea/en/apply?jobSeqNo=1")).toBe(true);
    expect(robotsRuleMatches("/private", "/private/x")).toBe(true);
    expect(robotsRuleMatches("/*.pdf$", "/files/a.pdf")).toBe(true);
    expect(robotsRuleMatches("/*.pdf$", "/files/a.pdf?x=1")).toBe(false);
  });
});

describe("expired listings", () => {
  it("leave the feed at the next 01:00 UTC refresh", () => {
    expect(expiryCutoff(new Date("2026-10-31T13:00:00Z")).toISOString()).toBe("2026-10-31T01:00:00.000Z");
    expect(expiryCutoff(new Date("2026-10-31T00:30:00Z")).toISOString()).toBe("2026-10-30T01:00:00.000Z");
  });
});
