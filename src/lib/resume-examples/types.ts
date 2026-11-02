// Resume Examples: fictional, pre-written sample résumés stored as data files in
// src/data/resume-examples. Browsing, search, filters and downloads only read
// these files: nothing here ever calls an AI service.
import { z } from "zod";

export const COUNTRY_CODES = ["us", "uk", "ca", "au", "de", "in"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];
export const LEVELS = ["entry", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];
export const TEMPLATE_IDS = ["meridian", "horizon", "ledger"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

const ym = z.string().regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, "use YYYY-MM");
const text = (max: number) => z.string().trim().min(1).max(max);

export const ResumeContent = z.object({
  name: text(60),
  title: text(80),
  phone: text(30),
  email: z.string().regex(/^[a-z0-9._-]+@example\.com$/, "emails must use example.com"),
  linkedin: z.string().regex(/^linkedin\.com\/in\/[a-z0-9-]+$/, "linkedin.com/in/<handle>"),
  location: text(60),
  summary: text(600),
  experience: z
    .array(
      z.object({
        title: text(80),
        company: text(80),
        location: text(60),
        start: ym,
        end: z.union([ym, z.literal("present")]),
        bullets: z.array(text(260)).min(3).max(5),
      }),
    )
    .min(1)
    .max(4),
  education: z.array(z.object({ degree: text(120), school: text(100), location: text(60), start: ym.optional(), end: ym, details: text(200).optional() })).min(1).max(3),
  courses: z.array(z.object({ name: text(100), provider: text(80), year: z.number().int().min(1990).max(2026) })).max(5),
  languages: z.array(z.object({ name: text(30), level: text(40) })).min(1).max(5),
  achievements: z.array(z.object({ title: text(70), detail: text(200) })).min(1).max(4),
  skills: z.array(text(40)).min(5).max(16),
  interests: z.array(text(50)).max(5),
});
export type ResumeContent = z.infer<typeof ResumeContent>;

export const Sample = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  category: z.string().regex(/^[a-z0-9-]+$/),
  role: z.string().regex(/^[a-z0-9-]+$/),
  country: z.enum(COUNTRY_CODES),
  level: z.enum(LEVELS),
  template: z.enum(TEMPLATE_IDS),
  content: ResumeContent,
});
export type Sample = z.infer<typeof Sample>;

/** Original writing guidance for one role, used by the role pages. */
export const RoleGuide = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text(60),
  category: z.string(),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intro: text(500),
  recruiterFocus: z.array(text(240)).min(3).max(6),
  experienceTips: z.array(text(260)).min(3).max(6),
  numbersTips: z.array(text(260)).min(3).max(6),
  noExperience: z.array(text(260)).min(2).max(5),
  hardSkills: z.array(text(60)).min(6).max(14),
  softSkills: z.array(z.object({ skill: text(40), proof: text(200) })).min(3).max(6),
  education: text(500),
  certifications: z.array(z.object({ name: text(100), note: text(220) })).min(1).max(6),
  summaryExample: text(500),
  objectiveExample: text(400),
  summaryVsObjective: text(400),
  extraSections: z.array(text(220)).min(2).max(5),
  weakStrong: z.array(z.object({ weak: text(200), strong: text(280), why: text(220) })).min(3).max(5),
  takeaways: z.array(text(220)).min(3).max(6),
  /** Role-specific notes per country: licences, local qualifications, terminology. */
  countryNotes: z.object(Object.fromEntries(COUNTRY_CODES.map((c) => [c, text(400)])) as Record<CountryCode, ReturnType<typeof text>>),
});
export type RoleGuide = z.infer<typeof RoleGuide>;

const ruled = <T extends z.ZodTypeAny>(v: T) => z.object({ value: v, note: text(600) });
/** One rules file per country, researched from public sources (listed in the file). */
export const CountryRules = z.object({
  code: z.enum(COUNTRY_CODES),
  name: text(40),
  slug: z.string().regex(/^[a-z-]+$/),
  term: ruled(z.enum(["resume", "CV", "resume or CV"])),
  paper: ruled(z.enum(["Letter", "A4"])),
  length: ruled(text(80)),
  photo: ruled(z.enum(["leave out", "optional", "common"])),
  include: z.array(text(200)).min(2),
  leaveOut: z.array(text(200)).min(2),
  dateFormat: z.object({ value: z.enum(["MMM YYYY", "MM/YYYY"]), example: text(40), note: text(400) }),
  education: z.object({ terms: z.array(z.object({ term: text(60), meaning: text(200) })).min(2), note: text(400) }),
  spelling: z.enum(["American", "British", "Canadian", "Australian"]),
  currency: z.object({ code: text(3), symbol: text(3) }),
  fictionalPhone: z.object({ pattern: text(80), note: text(300) }),
  disagreements: z.array(text(400)),
  tips: z.array(text(300)).min(3).max(8),
  /** `how`: "opened" = page read directly; "search-result" = only its search summary could be read (page fetching was blocked). */
  sources: z.array(z.object({ title: text(160), publisher: text(100), url: z.string().url(), accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), how: z.enum(["opened", "search-result"]) })).min(4),
});
export type CountryRules = z.infer<typeof CountryRules>;
