import { afterEach, describe, expect, it, vi } from "vitest";
import { careerjet, mapCareerjetJob } from "@/lib/jobs/sources/careerjet";
import { jooble, mapJoobleJob } from "@/lib/jobs/sources/jooble";
import { geoFields } from "@/lib/geo/detect";
import { normalizeSalaryYearlyUsd } from "@/lib/jobs/salary";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("Careerjet", () => {
  it("maps a v4 job, adding the country and converting weekly pay", () => {
    const j = mapCareerjetJob(
      { title: "Procurement <b>Analyst</b>", company: "Acme", date: "Wed,15 Nov 2025 19:13:43 GMT", description: "Spend analysis in Power BI", locations: "Hyderabad", salary: "₹10000 weekly", salary_currency_code: "INR", salary_min: 10000, salary_max: 12000, salary_type: "W", url: "https://jobviewtrack.com/v2/abc" },
      "IN",
    );
    expect(j).toMatchObject({ source: "careerjet", title: "Procurement Analyst", company: "Acme", location: "Hyderabad, India", salaryMin: 520000, salaryMax: 624000, salaryCurrency: "INR", salaryPeriod: "year" });
    expect(j.postedAt?.toISOString()).toBe("2025-11-15T19:13:43.000Z");
    expect(geoFields(j.location)).toMatchObject({ country: "IN", city: "Hyderabad" });
    expect(normalizeSalaryYearlyUsd(j)).toBe(6864); // INR→USD approximate
  });

  it("calls the v4 endpoint with Basic auth, India locale and the user's IP/agent", async () => {
    vi.stubEnv("CAREERJET_API_KEY", "cj-key");
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ type: "JOBS", hits: 1, jobs: [{ title: "Buyer", company: "X", locations: "Pune", url: "https://jobviewtrack.com/v2/1" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const jobs = await careerjet.fetchJobs({ keywords: ["procurement analyst"], country: "IN", client: { ip: "local", userAgent: "UA/1" } }, AbortSignal.timeout(5000), { boards: [] });
    expect(jobs).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://search.api.careerjet.net/v4/query");
    expect(u.searchParams.get("locale_code")).toBe("en_IN");
    expect(u.searchParams.get("user_ip")).toBe("127.0.0.1");
    expect(u.searchParams.get("user_agent")).toBe("UA/1");
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("cj-key:").toString("base64")}`);
  });

  it("skips background calls without a user, and handles location mode", async () => {
    vi.stubEnv("CAREERJET_API_KEY", "cj-key");
    const fetchMock = vi.fn(async () => json({ type: "LOCATIONS", message: "no matching location found", locations: [] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await careerjet.fetchJobs({ keywords: ["x"], country: "IN" }, AbortSignal.timeout(5000), { boards: [] })).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await careerjet.fetchJobs({ keywords: ["x"], country: "IN", location: "Nowhere", client: { ip: "1.2.3.4", userAgent: "UA" } }, AbortSignal.timeout(5000), { boards: [] })).toEqual([]);
    expect(careerjet.onDemandOnly).toBe(true);
  });
});

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
