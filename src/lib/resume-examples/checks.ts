// Quality checks for the Resume Examples data. Used by the unit test and by
// scripts/check-resume-examples.mts. Pure functions: no I/O, no AI.
import { COUNTRY_CODES, CountryRules, RoleGuide, Sample, type CountryCode, type Sample as S } from "./types";
import { PLAN, ROLES } from "./catalog";

/** Officially reserved fictional ranges (Ofcom, ACMA, Bundesnetzagentur, NANP 555-01xx); India has none, so an impossible 0-prefixed mobile is used. */
export const PHONE: Record<CountryCode, RegExp> = {
  us: /^\(\d{3}\) 555-01\d{2}$/,
  ca: /^\(\d{3}\) 555-01\d{2}$/,
  uk: /^07700 900\d{3}$/,
  au: /^0491 57\d \d{3}$/,
  de: /^\+49 (30 23125|69 90009|40 66969|221 4710|89 99998) \d{3}$/,
  in: /^\+91 00000 \d{5}$/,
};
/** Currency symbols that should not appear in another country's sample. */
const FOREIGN_MONEY: Record<CountryCode, RegExp> = {
  us: /[£€₹]|\bINR\b|\bEUR\b|\bGBP\b|A\$|C\$/,
  ca: /[£€₹]|\bINR\b|\bEUR\b|\bGBP\b|A\$|US\$/,
  uk: /\$|[€₹]|\bINR\b/,
  au: /[£€₹]|\bINR\b|US\$|C\$/,
  de: /\$|[£₹]|\bINR\b/,
  in: /\$|[£€]/,
};
const US_SPELL = /\b(optimi[sz]ation|organi[sz]ation|colou?r|cent(?:er|re)|analy[sz]e|behaviou?r)\b/gi;
const LAST_MONTH = "2026-10";
const months = (ym: string) => Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
const endOf = (e: string) => (e === "present" ? LAST_MONTH : e);

export type Issue = { id: string; problem: string };

export function checkSample(s: S): Issue[] {
  const out: Issue[] = [];
  const bad = (problem: string) => out.push({ id: s.id, problem });
  const parsed = Sample.safeParse(s);
  if (!parsed.success) return parsed.error.issues.map((i) => ({ id: s.id, problem: `${i.path.join(".")}: ${i.message}` }));
  const c = s.content;
  if (s.id !== `${s.role}-${s.country}-${s.level}`) bad("id must be <role>-<country>-<level>");
  const role = ROLES.find((r) => r.slug === s.role);
  if (!role) bad("unknown role");
  else if (role.category !== s.category) bad(`category should be ${role.category}`);
  if (!PHONE[s.country].test(c.phone)) bad(`phone "${c.phone}" is not in the fictional range for ${s.country}`);
  // Experience: count by level, dates in order, no overlaps, at most one current job (the latest).
  const jobs = [...c.experience].sort((a, b) => months(a.start) - months(b.start));
  const want = s.level === "entry" ? [1, 3] : [3, 4];
  if (jobs.length < want[0] || jobs.length > want[1]) bad(`${s.level} samples need ${want[0]}-${want[1]} jobs (has ${jobs.length})`);
  jobs.forEach((j, i) => {
    if (months(j.start) > months(endOf(j.end))) bad(`job "${j.title}" ends before it starts`);
    if (j.end !== "present" && months(j.end) > months(LAST_MONTH)) bad(`job "${j.title}" ends in the future`);
    if (j.end === "present" && i !== jobs.length - 1) bad("only the latest job can be current");
    if (i > 0 && months(j.start) <= months(endOf(jobs[i - 1].end))) bad(`jobs overlap: "${jobs[i - 1].title}" and "${j.title}"`);
  });
  const first = months(jobs[0].start);
  const total = (months(endOf(jobs[jobs.length - 1].end)) - first) / 12;
  const range = { entry: [0, 3.5], mid: [3, 10], senior: [7, 30] }[s.level];
  if (total < range[0] || total > range[1]) bad(`${s.level} career span ${total.toFixed(1)} years is outside ${range[0]}-${range[1]}`);
  const lastEdu = Math.max(...c.education.map((e) => months(e.end)));
  if (lastEdu > months(LAST_MONTH)) bad("education ends in the future");
  // Text checks.
  const all = JSON.stringify(c);
  if (FOREIGN_MONEY[s.country].test(all)) bad("uses another country's currency");
  if (/\benhancv\b/i.test(all)) bad("mentions Enhancv");
  for (const m of all.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?\s?%/g)) {
    const v = Number(m[1].replace(/,/g, ""));
    if (v > 300) bad(`unrealistic percentage: ${m[0]}`);
  }
  const words = (all.match(US_SPELL) ?? []).map((w) => w.toLowerCase());
  const british = words.filter((w) => /(isation|our|tre|yse)$/.test(w));
  const american = words.filter((w) => /(ization|or|ter|yze)$/.test(w));
  if (s.country === "us" && british.length) bad(`British spelling in a US sample: ${[...new Set(british)].join(", ")}`);
  if (["uk", "au", "in", "de"].includes(s.country) && american.length) bad(`American spelling in a ${s.country.toUpperCase()} sample: ${[...new Set(american)].join(", ")}`);
  return out;
}

const norm = (t: string) => t.toLowerCase().replace(/[\d.,%$£€₹]+/g, "#").replace(/[^a-z#\s]/g, " ").replace(/\s+/g, " ").trim();
const shingles = (t: string) => {
  const w = norm(t).split(" ");
  const set = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) set.add(w.slice(i, i + 3).join(" "));
  return set;
};
const jaccard = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n / (a.size + b.size - n || 1);
};

/** Repeated or near-identical bullets and summaries across all samples (ignoring numbers). */
export function duplicateIssues(samples: S[], threshold = 0.6): Issue[] {
  const out: Issue[] = [];
  const items: { id: string; kind: string; text: string; sh: Set<string> }[] = [];
  for (const s of samples) {
    items.push({ id: s.id, kind: "summary", text: s.content.summary, sh: shingles(s.content.summary) });
    for (const j of s.content.experience) for (const b of j.bullets) items.push({ id: s.id, kind: "bullet", text: b, sh: shingles(b) });
  }
  const seen = new Map<string, string>();
  for (const it of items) {
    const key = norm(it.text);
    const prev = seen.get(key);
    if (prev) out.push({ id: it.id, problem: `${it.kind} repeats one in ${prev}: "${it.text.slice(0, 70)}…"` });
    else seen.set(key, it.id);
  }
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.kind !== b.kind || a.sh.size < 4 || b.sh.size < 4 || norm(a.text) === norm(b.text)) continue;
      if (jaccard(a.sh, b.sh) >= threshold) out.push({ id: b.id, problem: `${b.kind} is nearly the same as one in ${a.id}: "${b.text.slice(0, 70)}…"` });
    }
  return out;
}

export function checkAll(samples: S[], guides: unknown[], countries: unknown[]): Issue[] {
  const out: Issue[] = samples.flatMap(checkSample);
  out.push(...duplicateIssues(samples));
  const ids = new Set(samples.map((s) => s.id));
  for (const p of PLAN) if (!ids.has(p.id)) out.push({ id: p.id, problem: "planned sample is missing" });
  for (const s of samples) {
    const p = PLAN.find((x) => x.id === s.id);
    if (p && p.template !== s.template) out.push({ id: s.id, problem: `template should be ${p.template}` });
  }
  for (const g of guides) {
    const r = RoleGuide.safeParse(g);
    const slug = (g as { slug?: string }).slug ?? "?";
    if (!r.success) out.push(...r.error.issues.map((i) => ({ id: `guide:${slug}`, problem: `${i.path.join(".")}: ${i.message}` })));
  }
  for (const r of ROLES) if (!guides.some((g) => (g as { slug?: string }).slug === r.slug)) out.push({ id: `guide:${r.slug}`, problem: "role guide is missing" });
  for (const c of countries) {
    const r = CountryRules.safeParse(c);
    if (!r.success) out.push(...r.error.issues.map((i) => ({ id: `country:${(c as { code?: string }).code}`, problem: `${i.path.join(".")}: ${i.message}` })));
  }
  for (const code of COUNTRY_CODES) if (!countries.some((c) => (c as { code?: string }).code === code)) out.push({ id: `country:${code}`, problem: "rules file is missing" });
  return out;
}
