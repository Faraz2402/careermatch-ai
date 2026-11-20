import { describe, expect, it } from "vitest";
import { minYearsFromText } from "@/lib/jobs/rank";
import { workdayHost, workdayPostedOn } from "@/lib/jobs/sources/ats-boards";
import { forEachBoard, inBoardCountries } from "@/lib/jobs/sources/employer-boards";
import type { NormalizedJob } from "@/lib/jobs/types";

const job = (title: string): NormalizedJob => ({
  source: "x", externalId: title, title, company: "C", location: "", workMode: "unknown", employmentType: "",
  salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, description: "", url: "", postedAt: null,
});

describe("minYearsFromText", () => {
  it.each([
    ["We need 5+ years of experience in Java.", 5],
    ["Minimum 3 years experience with SAP.", 3],
    ["3-5 years of relevant experience required", 3],
    ["7 yrs of hands-on experience", 7],
    ["Join a team of 200 people.", null],
  ])("%s -> %s", (text, want) => expect(minYearsFromText(text)).toBe(want));
});

describe("Workday helpers", () => {
  it("expands short hosts", () => {
    expect(workdayHost("intel.wd1")).toEqual({ host: "intel.wd1.myworkdayjobs.com", tenant: "intel" });
    expect(workdayHost("nvidia.wd5.myworkdayjobs.com").tenant).toBe("nvidia");
  });
  it("reads 'Posted N days ago'", () => {
    const now = Date.UTC(2026, 10, 20);
    expect(workdayPostedOn("Posted Today", now)?.getTime()).toBe(now);
    expect(workdayPostedOn("Posted Yesterday", now)?.getTime()).toBe(now - 86_400_000);
    expect(workdayPostedOn("Posted 30+ Days Ago", now)?.getTime()).toBe(now - 30 * 86_400_000);
    expect(workdayPostedOn("", now)).toBeNull();
  });
});

describe("forEachBoard", () => {
  it("keeps working boards and reports broken or empty ones", async () => {
    const jobs = await forEachBoard(["good", "empty", "broken"], async (b) => {
      if (b === "broken") throw new Error("HTTP 404");
      return b === "good" ? [job("A")] : [];
    });
    expect(jobs).toHaveLength(1);
    expect(jobs.warnings).toEqual(["empty: no current listings", "broken: HTTP 404"]);
  });
  it("throws only when every board fails", async () => {
    await expect(forEachBoard(["a"], async () => { throw new Error("down"); })).rejects.toThrow(/a: down/);
  });
});

describe("inBoardCountries (India by default)", () => {
  it.each([
    ["Bengaluru, Karnataka, India", "onsite", true],
    ["Hyderabad", "hybrid", true],
    ["San Francisco, CA", "onsite", false],
    ["Remote - Worldwide", "remote", true],
    ["Remote - US", "remote", false],
  ])("%s (%s) -> %s", (loc, mode, want) => expect(inBoardCountries(loc, mode)).toBe(want));
});
