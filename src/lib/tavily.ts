import "server-only";
// Tavily web search (https://tavily.com) - free plan: 1,000 searches a month,
// no card. Used when Gemini's free Google Search allowance runs out.

import { log } from "./log";

export type SearchHit = { title: string; url: string; snippet: string };

export class SearchQuotaError extends Error {}

export const tavilyEnabled = () => Boolean(process.env.TAVILY_API_KEY?.trim());

export async function tavilySearch(
  query: string,
  opts: { includeDomains?: string[]; excludeDomains?: string[]; maxResults?: number; country?: string } = {},
): Promise<SearchHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY!.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      search_depth: "basic", // 1 credit
      max_results: opts.maxResults ?? 8,
      ...(opts.includeDomains?.length && { include_domains: opts.includeDomains }),
      ...(opts.excludeDomains?.length && { exclude_domains: opts.excludeDomains }),
      ...(opts.country && { country: opts.country }),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    log.error("tavily.failed", { status: res.status, body: (await res.text()).slice(0, 300) });
    // 429 rate limit, 432 plan limit, 433 pay-as-you-go limit
    if ([429, 432, 433].includes(res.status)) throw new SearchQuotaError("The free monthly search allowance is used up.");
    if (res.status === 401) throw new Error("The Tavily API key is invalid.");
    throw new Error(`Search failed (${res.status}).`);
  }
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
  return (data.results ?? []).filter((r) => r.url).map((r) => ({ title: r.title ?? "", url: r.url!, snippet: r.content ?? "" }));
}
