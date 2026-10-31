import { afterEach, describe, expect, it, vi } from "vitest";
import { experienceLevel } from "@/lib/jobs/rank";
import { adzuna } from "@/lib/jobs/sources/keyed-apis";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("experience levels (job-board style)", () => {
  it.each([
    ["Procurement Intern", "internship"],
    ["Graduate Trainee - Supply Chain", "internship"],
    ["Junior Procurement Analyst", "entry"],
    ["Procurement Executive (Freshers)", "entry"],
    ["Associate, Strategic Sourcing", "associate"],
    ["Senior Associate - Procurement", "mid_senior"],
    ["Procurement Analyst", "mid_senior"],
    ["Senior Procurement Manager", "mid_senior"],
    ["Director of Procurement", "director"],
    ["Head of Sourcing", "director"],
    ["VP, Global Procurement", "executive"],
    ["Chief Procurement Officer", "executive"],
  ])("%s -> %s", (title, level) => expect(experienceLevel(title)).toBe(level));
});

describe("Adzuna freshness", () => {
  it("asks for newest-first listings within the requested window", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "id");
    vi.stubEnv("ADZUNA_APP_KEY", "key");
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify({ results: [] }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await adzuna.fetchJobs({ keywords: ["procurement"], country: "IN", maxDaysOld: 3 }, AbortSignal.timeout(5000), { boards: [] });
    const u = new URL(fetchMock.mock.calls[0][0]);
    expect(u.pathname).toBe("/v1/api/jobs/in/search/1");
    expect(u.searchParams.get("sort_by")).toBe("date");
    expect(u.searchParams.get("max_days_old")).toBe("3");
    await adzuna.fetchJobs({ keywords: ["procurement"], country: "IN", maxDaysOld: 365 }, AbortSignal.timeout(5000), { boards: [] });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("max_days_old")).toBe("30"); // hard cap
  });
});
