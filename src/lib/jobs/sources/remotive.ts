import type { SourceDefinition } from "../types";
import { fetchJson, htmlToText, parseSalaryText, toDate } from "../util";

type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
};

// Public API: https://remotive.com/remote-jobs/api - requires attribution and
// asks clients to fetch sparingly, so we cache the full feed for 6 hours and
// filter locally instead of issuing one request per search.
export const remotive: SourceDefinition = {
  id: "remotive",
  name: "Remotive",
  kind: "aggregator",
  homepage: "https://remotive.com",
  termsUrl: "https://remotive.com/remote-jobs/api",
  attribution: "Remote listings provided by Remotive.com (public API, attribution required).",
  cacheTtlMs: 6 * 60 * 60 * 1000,
  requestsPerMinute: 2,
  missingConfig: () => null,
  queryIndependent: true,
  async fetchJobs(_query, signal) {
    const data = await fetchJson<{ jobs: RemotiveJob[] }>("https://remotive.com/api/remote-jobs?limit=300", signal);
    return data.jobs
      .map((j) => ({
        source: "remotive",
        externalId: String(j.id),
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        workMode: "remote" as const,
        employmentType: (j.job_type ?? "").replace(/_/g, "-"),
        ...parseSalaryText(j.salary),
        description: htmlToText(j.description),
        url: j.url,
        postedAt: toDate(j.publication_date),
      }));
  },
};
