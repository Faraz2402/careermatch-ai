import { afterEach, describe, expect, it, vi } from "vitest";
import { jooble, mapJoobleJob } from "@/lib/jobs/sources/jooble";
import { geoFields } from "@/lib/geo/detect";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("Jooble", () => {
  it("maps a job and parses its salary", () => {
    const j = mapJoobleJob({ id: 42, title: "Sourcing Analyst", location: "Bengaluru, Karnataka", snippet: "<p>SAP Ariba sourcing</p>", salary: "600000 - 900000 INR", type: "Full-time", link: "https://in.jooble.org/jdp/42", company: "Acme", updated: "2026-10-28T10:00:00.0000000" }, "IN");
    expect(j).toMatchObject({ source: "jooble", externalId: "42", location: "Bengaluru, Karnataka, India", employmentType: "full-time", salaryMin: 600000, salaryMax: 900000, description: "SAP Ariba sourcing" });
    expect(geoFields(j.location)).toMatchObject({ country: "IN", city: "Bengaluru" });
  });

  it("POSTs to the India domain with the key in the path", async () => {
    vi.stubEnv("JOOBLE_API_KEY", "jb-key");
    vi.stubEnv("JOOBLE_COUNTRY", "in");
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ totalCount: 1, jobs: [{ id: 1, title: "Buyer", link: "https://in.jooble.org/jdp/1", location: "Pune" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const jobs = await jooble.fetchJobs({ keywords: ["procurement"], country: "IN" }, AbortSignal.timeout(5000), { boards: [] });
    expect(jobs).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://in.jooble.org/api/jb-key");
    expect(init!.method).toBe("POST");
    expect(JSON.parse(String(init!.body))).toMatchObject({ keywords: "procurement", location: "India" });
  });

  it("only serves its key's country and is quota-guarded", async () => {
    vi.stubEnv("JOOBLE_API_KEY", "jb-key");
    vi.stubEnv("JOOBLE_COUNTRY", "in");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await jooble.fetchJobs({ keywords: ["x"], country: "US" }, AbortSignal.timeout(5000), { boards: [] })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(jooble.countries).toEqual(["IN"]);
    expect(jooble.lifetimeQuota).toBeLessThanOrEqual(500);
    expect(jooble.onDemandOnly).toBe(true);
  });
});
