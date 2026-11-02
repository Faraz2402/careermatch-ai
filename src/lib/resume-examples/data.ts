// Read-only access to the pre-written Resume Examples. Pure data: no database, no network, no AI.
import { COUNTRY_RULES, GUIDES, SAMPLES } from "@/data/resume-examples";
import { CATEGORIES, ROLES } from "./catalog";
export { categoryOf, roleOf } from "./catalog";
import { COUNTRY_SLUGS, type DocFormat } from "./shared";
import { COUNTRY_CODES, LEVELS, type CountryCode, type CountryRules, type Level, type Sample } from "./types";

export * from "./shared";


/** Fallback rules (used only until a researched rules file exists for a country). */
const FALLBACK: Record<CountryCode, Pick<CountryRules, "paper" | "dateFormat" | "term">> = {
  us: { paper: { value: "Letter", note: "" }, dateFormat: { value: "MMM YYYY", example: "Mar 2024", note: "" }, term: { value: "resume", note: "" } },
  ca: { paper: { value: "Letter", note: "" }, dateFormat: { value: "MMM YYYY", example: "Mar 2024", note: "" }, term: { value: "resume", note: "" } },
  uk: { paper: { value: "A4", note: "" }, dateFormat: { value: "MMM YYYY", example: "Mar 2024", note: "" }, term: { value: "CV", note: "" } },
  au: { paper: { value: "A4", note: "" }, dateFormat: { value: "MMM YYYY", example: "Mar 2024", note: "" }, term: { value: "resume", note: "" } },
  de: { paper: { value: "A4", note: "" }, dateFormat: { value: "MM/YYYY", example: "03/2024", note: "" }, term: { value: "CV", note: "" } },
  in: { paper: { value: "A4", note: "" }, dateFormat: { value: "MMM YYYY", example: "Mar 2024", note: "" }, term: { value: "resume or CV", note: "" } },
};

export const allSamples = (): Sample[] => SAMPLES;
export const rulesFor = (c: CountryCode): CountryRules | undefined => COUNTRY_RULES.find((r) => r.code === c);
/** What the résumé itself needs: paper size, date format and the local word for it. */
export const formatFor = (c: CountryCode): DocFormat => {
  const r = rulesFor(c) ?? FALLBACK[c];
  return { paper: r.paper.value, dateFormat: r.dateFormat.value, term: r.term.value };
};
/** "CV" or "Resume" for headings in this market. */
export const termFor = (c: CountryCode) => (formatFor(c).term === "CV" ? "CV" : "Resume");

export const countryFromSlug = (slug: string) => COUNTRY_CODES.find((c) => COUNTRY_SLUGS[c] === slug);
export const guideFor = (role: string) => GUIDES.find((g) => g.slug === role);
export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id);

const levelRank = (l: Level) => LEVELS.indexOf(l);
export const samplesFor = (f: { role?: string; category?: string; country?: CountryCode; level?: Level }) =>
  SAMPLES.filter((s) => (!f.role || s.role === f.role) && (!f.category || s.category === f.category) && (!f.country || s.country === f.country) && (!f.level || s.level === f.level)).sort(
    (a, b) => COUNTRY_CODES.indexOf(a.country) - COUNTRY_CODES.indexOf(b.country) || levelRank(a.level) - levelRank(b.level) || a.role.localeCompare(b.role),
  );

/** Roles that have at least one published sample. */
export const publishedRoles = () => ROLES.filter((r) => SAMPLES.some((s) => s.role === r.slug));
/** Categories with at least one published sample (empty ones are hidden everywhere). */
export const visibleCategories = () => CATEGORIES.filter((c) => SAMPLES.some((s) => s.category === c.slug));
export const rolesIn = (category: string) => publishedRoles().filter((r) => r.category === category);

/** Hand-picked "Most popular" roles (only those that are published). */
const POPULAR = ["software-engineer", "registered-nurse", "data-analyst", "accountant", "project-manager", "teacher", "customer-service-representative", "sales-associate", "marketing-manager", "business-analyst", "administrative-assistant", "graphic-designer"];
export const popularRoles = () => POPULAR.map((slug) => publishedRoles().find((r) => r.slug === slug)).filter((r): r is (typeof ROLES)[number] => !!r);

/** The sample shown for a role card: the requested country, else the first available. */
export const coverSample = (role: string, country?: CountryCode) => samplesFor({ role, country })[0] ?? samplesFor({ role })[0];

/** Up to 12 samples for the home page, one per role, spread across categories. */
export function featured(country: CountryCode, category?: string): Sample[] {
  const pool = samplesFor({ country, category });
  const out: Sample[] = [];
  const cats = [...new Set(pool.map((s) => s.category))];
  for (let round = 0; out.length < 12 && round < 8; round++)
    for (const c of cats) {
      const next = pool.filter((s) => s.category === c && !out.includes(s))[0];
      if (next && out.length < 12) out.push(next);
    }
  return out;
}

