import { afterEach, describe, expect, it, vi } from "vitest";
import {
  boardCountries,
  mapOracleRequisition,
  mapSmartRecruiters,
  mapWorkable,
  oracle,
  parseBoard,
  parseSuccessFactorsRss,
  smartrecruiters,
  successfactors,
} from "@/lib/jobs/sources/ats-boards";
import { geoFields } from "@/lib/geo/detect";
import { robotsTxtAllows } from "@/lib/jobs/util";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const srPosting = {
  id: "744000158803980",
  name: "Business analyst key user and plant controlling ",
  releasedDate: "2026-10-30T17:09:50.414Z",
  company: { identifier: "BoschGroup", name: "Bosch Group" },
  location: { city: "Gangaikondan", region: "TN", country: "in", remote: false, hybrid: false, fullLocation: "Gangaikondan, TN, India" },
  function: { label: "Accounting/Auditing" },
  typeOfEmployment: { label: "Full-time" },
};

describe("config", () => {
  it("defaults to India and parses host/SITE=Company boards", () => {
    expect(boardCountries()).toEqual(["IN"]);
    vi.stubEnv("EMPLOYER_BOARD_COUNTRIES", "in,us");
    expect(boardCountries()).toEqual(["IN", "US"]);
    expect(parseBoard("fa-ewjt-saasfaprod1.fa.ocs.oraclecloud.com/CX_2=EXL")).toEqual({ host: "fa-ewjt-saasfaprod1.fa.ocs.oraclecloud.com", site: "CX_2", label: "EXL" });
    expect(parseBoard("jobs.bayer.com")).toEqual({ host: "jobs.bayer.com", site: "", label: "" });
  });

  it("reads robots.txt rules", () => {
    const robots = "User-agent: *\nDisallow: /services/\nDisallow: /preapply/";
    expect(robotsTxtAllows(robots, "/feeds/india/?locale=en_US")).toBe(true);
    expect(robotsTxtAllows(robots, "/services/rss/job/?locale=en_US")).toBe(false);
  });
});

describe("SmartRecruiters", () => {
  it("maps a posting with its full job ad", () => {
    const j = mapSmartRecruiters(srPosting, {
      ...srPosting,
      postingUrl: "https://jobs.smartrecruiters.com/BoschGroup/744000158803980-business-analyst",
      jobAd: { sections: { jobDescription: { title: "Job Description", text: "<p>SAP HANA transition</p>" }, qualifications: { title: "Qualifications", text: "<p>CMA Final</p>" } } },
    });
    expect(j).toMatchObject({ source: "smartrecruiters", externalId: "BoschGroup-744000158803980", title: "Business analyst key user and plant controlling", company: "Bosch Group", location: "Gangaikondan, TN, India", workMode: "onsite", employmentType: "full-time" });
    expect(j.description).toContain("SAP HANA transition");
    expect(j.summaryOnly).toBeUndefined();
    expect(geoFields(j.location)).toMatchObject({ country: "IN" });
  });

  it("flags postings without a fetched job ad as summary-only", () => {
    const j = mapSmartRecruiters({ ...srPosting, location: { ...srPosting.location, fullLocation: "Chennai, , India" } }, null);
    expect(j.summaryOnly).toBe(true);
    expect(j.location).toBe("Chennai, India");
    expect(j.url).toBe("https://jobs.smartrecruiters.com/BoschGroup/744000158803980");
  });

  it("asks only for the configured countries", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async (url) =>
      url.includes("/postings?") ? json({ totalFound: 1, content: [srPosting] }) : json({ ...srPosting, jobAd: { sections: {} } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const jobs = await smartrecruiters.fetchJobs({ keywords: [] }, AbortSignal.timeout(5000), { boards: ["BoschGroup"] });
    expect(jobs).toHaveLength(1);
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("country")).toBe("in");
  });
});

describe("Workable", () => {
  const job = { title: "Executive Service Planner", shortcode: "3EC1", employment_type: "Full-time", telecommuting: false, url: "https://apply.workable.com/j/3EC1", published_on: "2026-10-27", locations: [{ country: "India", countryCode: "IN", city: "Hyderabad", region: "Telangana" }], description: "<p>Plan routes</p>" };

  it("keeps jobs in the configured countries only", () => {
    expect(mapWorkable(job, "Rentokil Initial", ["IN"])).toMatchObject({ source: "workable", company: "Rentokil Initial", location: "Hyderabad, Telangana, India", description: "Plan routes" });
    expect(mapWorkable({ ...job, locations: [{ country: "Greece", countryCode: "GR", city: "Athens", region: "Attica" }] }, "X", ["IN"])).toBeNull();
  });
});

describe("SuccessFactors", () => {
  const rss = `<?xml version="1.0"?><rss><channel><title><![CDATA[Bayer]]></title>
<item><title><![CDATA[Therapy Business Executive (Trivandrum, Kerala, IN)]]></title><link>https://jobs.bayer.com/job/Trivandrum-Therapy-Business-Executive/1234567/?feedId=null&amp;utm_source=J2WRSS</link><guid>https://jobs.bayer.com/job/Trivandrum-Therapy-Business-Executive/1234567/</guid><description><![CDATA[<p>Drive sales</p>]]></description><pubDate>Thu, 29 Oct 2026 06:00:00 GMT</pubDate></item>
<item><title><![CDATA[ADAS Test Lead (Hyderabad, TG, IN, 500032)]]></title><link>https://jobs.zf.com/job/x/2222222/</link><description><![CDATA[x]]></description></item>
<item><title><![CDATA[Head of Legal - Mumbai (Mumbai, India, Maharashtra)]]></title><link>https://x.com/job/x/3333333/</link><description><![CDATA[x]]></description></item>
<item><title><![CDATA[Tomato Intern (Woodland, California, US)]]></title><link>https://jobs.bayer.com/job/x/7654321/</link><description><![CDATA[x]]></description></item>
</channel></rss>`;

  it("parses the feed and keeps the configured countries", () => {
    const jobs = parseSuccessFactorsRss(rss, "jobs.bayer.com", "Bayer", ["IN"]);
    expect(jobs.map((j) => j.location)).toEqual(["Trivandrum, Kerala, India", "Hyderabad, TG, India", "Mumbai, Maharashtra, India"]);
    expect(jobs[0]).toMatchObject({ source: "successfactors", externalId: "jobs.bayer.com-1234567", title: "Therapy Business Executive", company: "Bayer", location: "Trivandrum, Kerala, India", description: "Drive sales", url: "https://jobs.bayer.com/job/Trivandrum-Therapy-Business-Executive/1234567/" });
    expect(jobs[0].postedAt?.toISOString()).toBe("2026-10-29T06:00:00.000Z");
  });

  it("refuses hosts whose robots.txt disallows the feed", async () => {
    vi.stubGlobal("fetch", vi.fn(async (u: URL | string) => (String(u).endsWith("/robots.txt") ? new Response("User-agent: *\nDisallow: /feeds/") : new Response(rss))));
    await expect(successfactors.fetchJobs({ keywords: [] }, AbortSignal.timeout(5000), { boards: ["blocked.example.com=Blocked"] })).rejects.toThrow(/robots/);
  });
});

describe("Oracle Recruiting Cloud", () => {
  const req = { Id: "22153", Title: "Senior Executive", PostedDate: "2026-10-30", PrimaryLocation: "Pune, Maharashtra, India", PrimaryLocationCountry: "IN", WorkplaceType: "Hybrid", ShortDescriptionStr: "Automation Engineer - Data Governance" };

  it("maps a requisition with and without its detail", () => {
    const full = mapOracleRequisition(req, "fa-ewjt-saasfaprod1.fa.ocs.oraclecloud.com", "CX_2", "EXL", { ExternalDescriptionStr: "<p>Build data quality checks</p>", ExternalQualificationsStr: "<p>4-5 years</p>" });
    expect(full).toMatchObject({ source: "oracle", company: "EXL", workMode: "hybrid", location: "Pune, Maharashtra, India", url: "https://fa-ewjt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2/job/22153" });
    expect(full.description).toContain("Build data quality checks");
    expect(full.description).toContain("Qualifications\n4-5 years");
    expect(full.summaryOnly).toBeUndefined();
    expect(mapOracleRequisition(req, "h.example.com", "CX_2", "EXL", null)).toMatchObject({ description: "Automation Engineer - Data Governance", summaryOnly: true });
  });

  it("queries India newest-first and reads details", async () => {
    const fetchMock = vi.fn(async (u: URL | string) => {
      const url = String(u);
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      if (url.includes("recruitingCEJobRequisitionDetails")) return json({ items: [{ ExternalDescriptionStr: "<p>Full text</p>" }] });
      return json({ items: [{ TotalJobsCount: 1, requisitionList: [req] }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const jobs = await oracle.fetchJobs({ keywords: [] }, AbortSignal.timeout(5000), { boards: ["h.example.com/CX_2=EXL"] });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].description).toBe("Full text");
    const listUrl = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("findReqs"))!;
    expect(decodeURIComponent(listUrl)).toContain("location=India,sortBy=POSTING_DATES_DESC");
  });
});
