import { describe, expect, it } from "vitest";
import { detectLocation, jobAvailableIn, remoteCounts, remoteWorldwide } from "@/lib/geo/detect";
import { relativeDate } from "@/lib/format";

const geo = (location: string) => detectLocation(location);

describe("remote dropdown", () => {
  const jobs = [geo("Remote - Worldwide"), geo("Remote, India"), geo("Remote (Europe)"), geo("Remote - US")];
  const countries = [
    { code: "IN", region: "Asia" as const },
    { code: "DE", region: "Europe" as const },
    { code: "US", region: "North America" as const },
  ];

  it("counts worldwide roles and the roles open to each country", () => {
    const { worldwide, countries: byCountry } = remoteCounts(jobs, countries);
    expect(worldwide).toBe(1);
    expect(Object.fromEntries(byCountry.map((c) => [c.code, c.jobs]))).toEqual({ IN: 2, DE: 2, US: 2 });
  });

  it("matches the search filter's eligibility rule", () => {
    for (const c of countries) {
      const expected = remoteCounts(jobs, countries).countries.find((x) => x.code === c.code)!.jobs;
      expect(jobs.filter((j) => jobAvailableIn(j, c.code, true)).length).toBe(expected);
    }
    expect(jobs.filter(remoteWorldwide)).toHaveLength(1);
  });
});

describe("relativeDate", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000 - 60_000);
  it("never says a month for listings inside the 30-day window", () => {
    expect(relativeDate(daysAgo(29))).toBe("29 days ago");
    expect(relativeDate(daysAgo(30))).toBe("30 days ago");
    expect(relativeDate(daysAgo(45))).toBe("Over a month ago");
    expect(relativeDate(daysAgo(95))).toBe("3 mo ago");
  });
});
