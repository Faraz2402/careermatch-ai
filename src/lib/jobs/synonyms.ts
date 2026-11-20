// Job titles that mean the same job. Job sites match "procurement" to
// purchasing, sourcing and buyer roles too; so do we, both when filtering
// listings and when asking sources for more of them.

const GROUPS: string[][] = [
  ["procurement", "purchasing", "purchase", "sourcing", "buyer"],
  ["software engineer", "software developer", "sde", "programmer"],
  ["developer", "engineer", "programmer"],
  ["frontend", "front end", "front-end", "ui developer"],
  ["backend", "back end", "back-end"],
  ["full stack", "fullstack", "full-stack"],
  ["data analyst", "analytics analyst", "mis analyst", "reporting analyst"],
  ["data scientist", "machine learning engineer", "ml engineer"],
  ["hr", "human resources", "people partner", "talent acquisition", "recruiter"],
  ["recruiter", "talent acquisition"],
  ["accountant", "accounts executive", "accounting", "accounts officer"],
  ["finance", "financial analyst", "fp&a"],
  ["sales", "business development", "account executive"],
  ["marketing", "digital marketing", "brand manager", "growth marketing"],
  ["customer support", "customer service", "customer care", "customer success"],
  ["supply chain", "logistics", "inventory", "warehouse"],
  ["logistics", "supply chain", "shipping"],
  ["project manager", "program manager", "project lead"],
  ["product manager", "product owner"],
  ["designer", "ui/ux", "ux designer", "product designer"],
  ["qa", "quality assurance", "test engineer", "sdet", "tester"],
  ["devops", "site reliability", "sre", "platform engineer", "cloud engineer"],
  ["business analyst", "functional consultant", "systems analyst"],
  ["admin", "administrator", "office manager", "administration"],
  ["legal", "lawyer", "counsel", "advocate"],
  ["nurse", "nursing"],
  ["teacher", "faculty", "tutor", "educator"],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = (s: string) => new RegExp(`(^|[^a-z0-9])${escape(s)}(?=$|[^a-z0-9])`, "i");

/**
 * "procurement" -> procurement, purchasing, purchase, sourcing, buyer.
 * "procurement analyst" -> procurement analyst, purchasing analyst, sourcing analyst, ...
 * Unknown terms come back unchanged. The original term is always first.
 */
export function expandTitleTerm(term: string): string[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  const out = new Set([t]);
  for (const group of GROUPS) {
    const hit = group.find((g) => word(g).test(t));
    if (!hit) continue;
    for (const alt of group) if (alt !== hit) out.add(t.replace(word(hit), (m, pre) => `${pre}${alt}`).trim());
  }
  return [...out].slice(0, 8);
}

export const expandTitleTerms = (terms: string[]) => [...new Set(terms.flatMap(expandTitleTerm))];

/** Does a title (or company) contain any of the terms as whole words? */
export function titleMatches(text: string, terms: string[]) {
  return terms.some((t) => word(t).test(text));
}
