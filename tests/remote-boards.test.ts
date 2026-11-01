import { describe, expect, it } from "vitest";
import { detectLocation, remoteWorldwide } from "@/lib/geo/detect";
import { mapHimalayas, mapJobicy, mapRemoteOk, mapWorkingNomads, parseRealWorkFromAnywhere, parseWeWorkRemotely, remoteLocation } from "@/lib/jobs/sources/remote-boards";

const now = Math.floor(Date.now() / 1000);

describe("remote locations", () => {
  it("marks open-to-anyone roles as worldwide and keeps restrictions", () => {
    expect(remoteLocation("")).toBe("Remote - Worldwide");
    expect(remoteLocation("Anywhere")).toBe("Remote - Worldwide");
    expect(remoteLocation([])).toBe("Remote - Worldwide");
    expect(remoteLocation(["India", "Philippines"])).toBe("Remote - India, Philippines");
    expect(remoteWorldwide(detectLocation(remoteLocation("Worldwide")))).toBe(true);
    expect(detectLocation(remoteLocation(["India"])).countries).toEqual(["IN"]);
  });
});

describe("remote boards", () => {
  it("Remote OK skips the legal notice and maps a job", () => {
    expect(mapRemoteOk({ id: undefined })).toBeNull();
    const j = mapRemoteOk({ id: "1137608", date: new Date().toISOString(), company: "Adaptyv", position: "Account Executive", location: "", url: "https://remoteOK.com/remote-jobs/x-1137608", salary_min: 90000, salary_max: 120000 })!;
    expect(j).toMatchObject({ source: "remoteok", location: "Remote - Worldwide", workMode: "remote", salaryMin: 90000, salaryCurrency: "USD", url: "https://remoteOK.com/remote-jobs/x-1137608" });
  });

  it("We Work Remotely splits company and title and reads the region", () => {
    const xml = `<rss><channel><item><title>Anduril Industries: Senior TA Operations Specialist</title><region>USA Only</region><country></country><type>Full-Time</type><description>&lt;p&gt;Defense tech&lt;/p&gt;</description><pubDate>Sat, 31 Oct 2026 16:00:20 +0000</pubDate><link>https://weworkremotely.com/remote-jobs/anduril-x</link></item>
<item><title>Acme: Data Analyst</title><region>Anywhere in the World</region><link>https://weworkremotely.com/remote-jobs/acme-y</link><pubDate>Sat, 31 Oct 2026 16:00:20 +0000</pubDate></item></channel></rss>`;
    const [a, b] = parseWeWorkRemotely(xml);
    expect(a).toMatchObject({ company: "Anduril Industries", title: "Senior TA Operations Specialist", location: "Remote - USA", employmentType: "full-time", externalId: "remote-jobs/anduril-x" });
    expect(b.location).toBe("Remote - Worldwide");
  });

  it("Jobicy keeps salary and geo", () => {
    const j = mapJobicy({ id: 158260, url: "https://jobicy.com/jobs/158260", jobTitle: "Full-Stack Engineer", companyName: "Thumbtack", jobType: ["Full-Time"], jobGeo: "USA", pubDate: "2026-10-31T17:05:04+00:00", salaryMin: 151300, salaryMax: 229900, salaryCurrency: "USD", salaryPeriod: "yearly" });
    expect(j).toMatchObject({ location: "Remote - USA", salaryMin: 151300, salaryPeriod: "year", employmentType: "full-time" });
  });

  it("Himalayas uses the applicationLink and drops expired jobs", () => {
    const base = { title: "Product Engineer", companyName: "Bjak", locationRestrictions: ["Philippines"], pubDate: now, applicationLink: "https://himalayas.app/companies/bjak/jobs/pe-1?utm_source=api", guid: "https://himalayas.app/companies/bjak/jobs/pe-1" };
    expect(mapHimalayas(base)).toMatchObject({ url: base.applicationLink, location: "Remote - Philippines", externalId: "companies/bjak/jobs/pe-1" });
    expect(mapHimalayas({ ...base, expiryDate: now - 60 })).toBeNull();
  });

  it("Working Nomads treats time-zone notes as unscoped remote", () => {
    const base = { url: "https://www.workingnomads.com/job/go/1981017/", title: "Magento Developer", company_name: "Lemon.io", pub_date: "2026-10-29T09:50:51-04:00" };
    expect(mapWorkingNomads({ ...base, location: "CET (+/- 3 hours)" }).location).toBe("Remote");
    expect(mapWorkingNomads({ ...base, location: "Global" })).toMatchObject({ location: "Remote - Worldwide", externalId: "1981017" });
  });

  it("Real Work From Anywhere splits 'Title at Company'", () => {
    const xml = `<rss><channel><item><title><![CDATA[Junior Crypto Analyst & Trader at Empire Assets]]></title><link>https://www.realworkfromanywhere.com/jobs/junior-701</link><pubDate>Thu, 08 Oct 2026 14:17:26 GMT</pubDate><description><![CDATA[<p>Trading</p>]]></description></item></channel></rss>`;
    expect(parseRealWorkFromAnywhere(xml)[0]).toMatchObject({ title: "Junior Crypto Analyst & Trader", company: "Empire Assets", location: "Remote - Worldwide", description: "Trading" });
  });
});
