import type { NormalizedJob, WorkMode } from "./types";

export const USER_AGENT = "CareerMatchAI/1.0 (+job-matching; respects robots.txt)";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z#0-9]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/** HTML -> readable plain text (keeps paragraph and list breaks). */
export function htmlToText(html: string) {
  const decoded = /&lt;\w/.test(html) ? decodeEntities(html) : html; // Greenhouse double-encodes
  return decodeEntities(
    decoded
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|h[1-6]|li|ul|ol|br)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function detectWorkMode(...texts: (string | undefined | null)[]): WorkMode {
  const t = texts.filter(Boolean).join(" ").toLowerCase();
  if (/\bhybrid\b/.test(t)) return "hybrid";
  if (/\bremote\b|work from home|anywhere/.test(t)) return "remote";
  if (/on-?site|in[- ]office/.test(t)) return "onsite";
  return t.trim() ? "onsite" : "unknown";
}

export function toDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function matchesKeywords(job: Pick<NormalizedJob, "title" | "description">, keywords: string[]) {
  if (keywords.length === 0) return true;
  const hay = `${job.title} ${job.description}`.toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

export async function fetchJson<T>(url: string, signal: AbortSignal, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (res.status === 429) throw new Error("Rate limited by provider");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const csvEnv = (name: string) =>
  (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Parse salary ranges like "$120k - $150k", "USD 90,000–110,000". */
export function parseSalaryText(text: string): Pick<NormalizedJob, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod"> {
  const none = { salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null };
  if (!text) return none;
  const nums = [...text.matchAll(/(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s*(k)?/gi)]
    .map((m) => parseFloat(m[1].replace(/[,.](?=\d{3}\b)/g, "")) * (m[2] ? 1000 : 1))
    .filter((n) => n >= 10);
  if (nums.length === 0) return none;
  const currency = /€|eur/i.test(text) ? "EUR" : /£|gbp/i.test(text) ? "GBP" : /\$|usd/i.test(text) ? "USD" : null;
  const period = /hour|\/hr|hourly/i.test(text) ? "hour" : /month/i.test(text) ? "month" : "year";
  return { salaryMin: Math.round(Math.min(...nums)), salaryMax: Math.round(Math.max(...nums)), salaryCurrency: currency, salaryPeriod: period };
}
