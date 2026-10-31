export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

/** A listing exactly as normalised from one source response. */
export type NormalizedJob = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null; // year | month | hour
  description: string; // plain text
  url: string;
  postedAt: Date | null;
};

/** `country` is an ISO code; only sources that declare `countries` use it. */
export type SourceQuery = {
  keywords: string[];
  location?: string;
  country?: string;
  /** The end user who triggered the search (some APIs, e.g. Careerjet, require it). */
  client?: { ip: string; userAgent: string };
};

/** Operator configuration resolved per run (DB overrides, then env). */
export type SourceContext = { boards: string[] };

export type SourceKind = "official_api" | "employer_feed" | "aggregator" | "user_link" | "demo";

export type SourceDefinition = {
  id: string;
  name: string;
  kind: SourceKind;
  /** Env var holding default board tokens (employer feeds only). */
  boardsEnv?: string;
  /** ISO codes this source can search by country (first = default). */
  countries?: string[];
  /** Env var listing countries to ingest by default (e.g. ADZUNA_COUNTRIES). */
  countriesEnv?: string;
  homepage: string;
  /** Short attribution / terms note shown in the UI next to every listing. */
  attribution: string;
  termsUrl?: string;
  /** How long a fetched response may be reused. Respect provider guidance. */
  cacheTtlMs: number;
  /** Feed returns the full listing set regardless of query (cached once, filtered locally). */
  queryIndependent?: boolean;
  /** Max outbound requests per minute across all users. */
  requestsPerMinute: number;
  /** Only call when a user searches (never from background ingestion). */
  onDemandOnly?: boolean;
  /** Hard lifetime request cap for the API key (e.g. Jooble free plan: 500). */
  lifetimeQuota?: number;
  /** Returns a reason when the source can't run (missing key, no boards). */
  missingConfig: (ctx: SourceContext) => string | null;
  fetchJobs: (query: SourceQuery, signal: AbortSignal, ctx: SourceContext) => Promise<NormalizedJob[]>;
};

export type SourceStatus = {
  id: string;
  name: string;
  ok: boolean;
  cached: boolean;
  count: number;
  error?: string;
  skipped?: string;
  updatedAt?: string;
};
