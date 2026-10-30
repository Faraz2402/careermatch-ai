import type { SourceDefinition } from "../types";
import { detectWorkMode, fetchJson, htmlToText, toDate } from "../util";

type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  job_types: string[];
  location: string;
  created_at: number;
};

// Free public job-board API: https://www.arbeitnow.com/blog/job-board-api
export const arbeitnow: SourceDefinition = {
  id: "arbeitnow",
  name: "Arbeitnow",
  kind: "aggregator",
  homepage: "https://www.arbeitnow.com",
  termsUrl: "https://www.arbeitnow.com/blog/job-board-api",
  attribution: "Listings via the Arbeitnow public job-board API (mostly Europe).",
  cacheTtlMs: 60 * 60 * 1000,
  requestsPerMinute: 6,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    // Page 1 must succeed (so an outage is reported, not cached as "no jobs").
    const first = await fetchJson<{ data: ArbeitnowJob[] }>("https://www.arbeitnow.com/api/job-board-api?page=1", signal);
    const second = await fetchJson<{ data: ArbeitnowJob[] }>("https://www.arbeitnow.com/api/job-board-api?page=2", signal).catch(() => ({ data: [] }));
    return [first, second]
      .flatMap((p) => p.data)
      .map((j) => ({
        source: "arbeitnow",
        externalId: j.slug,
        title: j.title,
        company: j.company_name,
        location: j.location,
        workMode: j.remote ? ("remote" as const) : detectWorkMode(j.location, j.title),
        employmentType: (j.job_types ?? []).join(", "),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        description: htmlToText(j.description),
        url: j.url,
        postedAt: toDate(j.created_at),
      }));
  },
};
