import "server-only";
// Import a single job posting from a URL the user supplies. We fetch the page
// once (respecting robots.txt), and read the schema.org JobPosting data that
// employers publish for search engines. Known ATS URLs are resolved through
// their official public APIs instead of the HTML page.

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { NormalizedJob } from "./types";
import { USER_AGENT, detectWorkMode, fetchJson, htmlToText, toDate, decodeEntities } from "./util";

export class ImportError extends Error {}

function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError("That doesn't look like a valid URL.");
  }
  if (!/^https?:$/.test(url.protocol)) throw new ImportError("Only http(s) links are supported.");
  const host = url.hostname.toLowerCase();
  // Basic SSRF protection: never fetch local or private-network addresses.
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.includes(":") // IPv6 literals
  )
    throw new ImportError("That address can't be imported.");
  return url;
}

const PRIVATE_V4 = /^(127\.|10\.|192\.168\.|169\.254\.|0\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)|^172\.(1[6-9]|2\d|3[01])\./;
export function isPrivateAddress(ip: string) {
  if (isIP(ip) === 4) return PRIVATE_V4.test(ip);
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || (v6.startsWith("::ffff:") && PRIVATE_V4.test(v6.slice(7)));
}

/** Resolve the host and refuse private / loopback / link-local targets. */
async function assertPublicHost(url: URL) {
  assertPublicHttpUrl(url.href);
  const addrs = await lookup(url.hostname, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new ImportError("That address could not be resolved.");
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new ImportError("That address can't be imported.");
}

/** fetch() that re-validates every redirect hop (max 5) against SSRF rules. */
export async function safeFetch(start: URL, init: RequestInit & { signal: AbortSignal }): Promise<Response> {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const next = res.headers.get("location");
    if (!next) return res;
    url = new URL(next, url);
  }
  throw new ImportError("Too many redirects.");
}

/** Minimal robots.txt check for our user agent (and *). */
async function robotsAllows(url: URL, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await safeFetch(new URL("/robots.txt", url.origin), { signal, headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return true; // no robots.txt => allowed
    const lines = (await res.text()).split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
    let applies = false;
    const disallow: string[] = [];
    const allow: string[] = [];
    for (const line of lines) {
      const [k, ...rest] = line.split(":");
      const key = k?.toLowerCase().trim();
      const value = rest.join(":").trim();
      if (key === "user-agent") applies = value === "*" || /careermatch/i.test(value);
      else if (applies && key === "disallow" && value) disallow.push(value);
      else if (applies && key === "allow" && value) allow.push(value);
    }
    const path = url.pathname + url.search;
    const longest = (rules: string[]) => Math.max(-1, ...rules.filter((r) => path.startsWith(r.replace(/\*.*$/, ""))).map((r) => r.length));
    return longest(allow) >= longest(disallow);
  } catch (e) {
    if (e instanceof ImportError) throw e;
    return true;
  }
}

type JsonLdPosting = {
  "@type"?: string | string[];
  title?: string;
  description?: string;
  datePosted?: string;
  employmentType?: string | string[];
  hiringOrganization?: { name?: string } | string;
  jobLocation?: { address?: { addressLocality?: string; addressRegion?: string; addressCountry?: string | { name?: string } } } | { address?: unknown }[];
  jobLocationType?: string;
  baseSalary?: { currency?: string; value?: { minValue?: number; maxValue?: number; value?: number; unitText?: string } };
  identifier?: { value?: string } | string;
};

function findPosting(node: unknown): JsonLdPosting | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findPosting(n);
      if (f) return f;
    }
    return null;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return obj as JsonLdPosting;
  return findPosting(obj["@graph"]);
}

function locationText(loc: JsonLdPosting["jobLocation"]): string {
  const first = Array.isArray(loc) ? loc[0] : loc;
  const a = (first as { address?: Record<string, unknown> } | undefined)?.address;
  if (!a) return "";
  const country = typeof a.addressCountry === "object" ? (a.addressCountry as { name?: string })?.name : a.addressCountry;
  return [a.addressLocality, a.addressRegion, country].filter(Boolean).join(", ");
}

const idFor = (url: string) => createHash("sha1").update(url).digest("hex").slice(0, 16);

export async function importJobFromUrl(raw: string): Promise<NormalizedJob> {
  const url = assertPublicHttpUrl(raw.trim());
  const signal = AbortSignal.timeout(15_000);

  // Greenhouse / Lever / Ashby links -> official APIs.
  const gh = url.href.match(/(?:boards|job-boards)\.greenhouse\.io\/([\w-]+)\/jobs\/(\d+)/);
  if (gh) {
    const j = await fetchJson<{ id: number; title: string; location?: { name: string }; content: string; absolute_url: string; updated_at: string; first_published?: string; company_name?: string }>(
      `https://boards-api.greenhouse.io/v1/boards/${gh[1]}/jobs/${gh[2]}`,
      signal,
    ).catch(() => null);
    if (j)
      return {
        source: "user_link", externalId: `greenhouse-${gh[1]}-${j.id}`, title: j.title, company: j.company_name ?? gh[1],
        location: j.location?.name ?? "", workMode: detectWorkMode(j.location?.name), employmentType: "",
        salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null,
        description: htmlToText(j.content), url: j.absolute_url, postedAt: toDate(j.first_published ?? j.updated_at),
      };
  }
  const lv = url.href.match(/jobs\.lever\.co\/([\w-]+)\/([0-9a-f-]{36})/);
  if (lv) {
    const p = await fetchJson<{ id: string; text: string; categories?: { location?: string; commitment?: string }; descriptionPlain?: string; additionalPlain?: string; lists?: { text: string; content: string }[]; hostedUrl: string; createdAt: number; workplaceType?: string }>(
      `https://api.lever.co/v0/postings/${lv[1]}/${lv[2]}?mode=json`,
      signal,
    ).catch(() => null);
    if (p)
      return {
        source: "user_link", externalId: `lever-${p.id}`, title: p.text, company: lv[1],
        location: p.categories?.location ?? "", workMode: p.workplaceType === "remote" ? "remote" : detectWorkMode(p.categories?.location),
        employmentType: p.categories?.commitment ?? "", salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null,
        description: [p.descriptionPlain, ...(p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`), p.additionalPlain].filter(Boolean).join("\n\n"),
        url: p.hostedUrl, postedAt: toDate(p.createdAt),
      };
  }

  if (!(await robotsAllows(url, signal)))
    throw new ImportError("This site's robots.txt doesn't allow automated access to that page. Paste the job description instead.");

  const res = await safeFetch(url, { signal, headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
  if (res.status === 401 || res.status === 403) throw new ImportError("That page requires sign-in or blocks automated access. Paste the job description instead.");
  if (!res.ok) throw new ImportError(`The page returned HTTP ${res.status}.`);
  const html = (await res.text()).slice(0, 3_000_000);

  let posting: JsonLdPosting | null = null;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      posting = findPosting(JSON.parse(m[1].trim()));
    } catch {
      /* ignore malformed blocks */
    }
    if (posting) break;
  }
  if (!posting?.title)
    throw new ImportError("No structured job data (schema.org JobPosting) was found on that page. Paste the job description instead.");

  const org = typeof posting.hiringOrganization === "string" ? posting.hiringOrganization : posting.hiringOrganization?.name;
  const v = posting.baseSalary?.value;
  const unit = (v?.unitText ?? "").toUpperCase();
  const location = locationText(posting.jobLocation);
  return {
    source: "user_link",
    externalId: idFor(url.href),
    title: decodeEntities(posting.title),
    company: org ? decodeEntities(org) : url.hostname.replace(/^www\./, ""),
    location: location || (posting.jobLocationType === "TELECOMMUTE" ? "Remote" : ""),
    workMode: posting.jobLocationType === "TELECOMMUTE" ? "remote" : detectWorkMode(location, posting.title),
    employmentType: [posting.employmentType].flat().filter(Boolean).join(", ").toLowerCase().replace(/_/g, "-"),
    salaryMin: v?.minValue ?? v?.value ?? null,
    salaryMax: v?.maxValue ?? v?.value ?? null,
    salaryCurrency: v ? posting.baseSalary?.currency ?? null : null,
    salaryPeriod: v ? (unit === "HOUR" ? "hour" : unit === "MONTH" ? "month" : "year") : null,
    description: htmlToText(posting.description ?? ""),
    url: url.href,
    postedAt: toDate(posting.datePosted),
  };
}

/** For jobs the user pastes in directly (no URL). */
export function jobFromPastedText(input: { title: string; company: string; location?: string; description: string; url?: string }): NormalizedJob {
  return {
    source: "user_link",
    externalId: idFor(`${input.title}|${input.company}|${input.description.slice(0, 200)}`),
    title: input.title.trim(),
    company: input.company.trim(),
    location: input.location?.trim() ?? "",
    workMode: detectWorkMode(input.location, input.description.slice(0, 500)),
    employmentType: "",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    description: input.description.trim(),
    url: input.url?.trim() ?? "",
    postedAt: null,
  };
}
