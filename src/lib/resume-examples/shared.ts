// Client-safe helpers for Resume Examples (no data imports, so they don't pull every sample into the browser).
import type { CountryCode, Level, Sample } from "./types";

export const NOTICE = "Fictional sample. Replace all details and numbers with your own true information.";
export const LEVEL_LABEL: Record<Level, string> = { entry: "Entry level", mid: "Mid level", senior: "Senior" };
export const COUNTRY_NAMES: Record<CountryCode, string> = { us: "United States", uk: "United Kingdom", ca: "Canada", au: "Australia", de: "Germany", in: "India" };
export const COUNTRY_SLUGS: Record<CountryCode, string> = { us: "united-states", uk: "united-kingdom", ca: "canada", au: "australia", de: "germany", in: "india" };
export const FLAG: Record<CountryCode, string> = { us: "🇺🇸", uk: "🇬🇧", ca: "🇨🇦", au: "🇦🇺", de: "🇩🇪", in: "🇮🇳" };
export const roleHref = (s: { category: string; role?: string; slug?: string }) => `/resume-examples/${s.category}/${s.role ?? s.slug}`;
export const sampleHref = (s: Sample) => `${roleHref(s)}/${COUNTRY_SLUGS[s.country]}`;

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2024-03" -> "Mar 2024" or "03/2024" (per the country's rules). */
export function fmtDate(ym: string | undefined, fmt: "MMM YYYY" | "MM/YYYY") {
  if (!ym) return "";
  if (ym === "present") return "Present";
  const [y, m] = ym.split("-");
  return fmt === "MM/YYYY" ? `${m}/${y}` : `${MON[Number(m) - 1]} ${y}`;
}

/** Format info a résumé needs to render: from the country's rules file. */
export type DocFormat = { paper: "Letter" | "A4"; dateFormat: "MMM YYYY" | "MM/YYYY"; term: string };

const key = (ym: string) => (ym === "present" ? "9999-99" : ym);
/** Reverse-chronological order (current job first), whatever order the data file uses. */
export const newestFirst = <T extends { start?: string; end: string }>(xs: T[]) => [...xs].sort((a, b) => key(b.end).localeCompare(key(a.end)) || (b.start ?? "").localeCompare(a.start ?? ""));
