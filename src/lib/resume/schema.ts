import { z } from "zod";

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string().describe("e.g. 'Jan 2021' or '2021'; empty if unknown"),
  endDate: z.string().describe("e.g. 'Present', 'Mar 2023'; empty if unknown"),
  highlights: z.array(z.string()),
});

export const EducationSchema = z.object({
  school: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  details: z.string(),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string(),
  technologies: z.array(z.string()),
});

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
});

export const LinkSchema = z.object({
  label: z.string().describe("e.g. LinkedIn, GitHub, Portfolio"),
  url: z.string(),
});

export const SkillGroupSchema = z.object({
  category: z.string().describe("e.g. Languages, Frameworks, Cloud, Tools, Soft skills"),
  skills: z.array(z.string()),
});

export const ResumeDataSchema = z.object({
  name: z.string(),
  headline: z.string(),
  location: z.string(),
  email: z.string(),
  phone: z.string(),
  summary: z.string(),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillGroupSchema),
  certifications: z.array(CertificationSchema),
  projects: z.array(ProjectSchema),
  links: z.array(LinkSchema),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

export const emptyResume = (): ResumeData => ({
  name: "",
  headline: "",
  location: "",
  email: "",
  phone: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  links: [],
});

export const VisibilitySchema = z.object({
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showLocation: z.boolean(),
  showExperience: z.boolean(),
  showEducation: z.boolean(),
  showSkills: z.boolean(),
  showProjects: z.boolean(),
  showCertifications: z.boolean(),
  showLinks: z.boolean(),
});
export type Visibility = z.infer<typeof VisibilitySchema>;

export const defaultVisibility = (): Visibility => ({
  showEmail: false,
  showPhone: false,
  showLocation: true,
  showExperience: true,
  showEducation: true,
  showSkills: true,
  showProjects: true,
  showCertifications: true,
  showLinks: true,
});

export const SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "executive"] as const;

export const PreferencesSchema = z.object({
  roles: z.array(z.string()),
  /** Kept for older saved preferences; `seniorities` is what the form edits. "any" = match my experience. */
  seniority: z.enum(["any", ...SENIORITY_LEVELS]),
  /** Levels the user wants; empty = match my experience. */
  seniorities: z.array(z.enum(SENIORITY_LEVELS)).default([]),
  locations: z.array(z.string()),
  workModes: z.array(z.enum(["remote", "hybrid", "onsite"])),
  /** Yearly amounts in `salaryCurrency` (older preferences are USD). */
  salaryMin: z.number().int().nonnegative().nullable(),
  salaryMax: z.number().int().nonnegative().nullable(),
  salaryCurrency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  employmentTypes: z.array(z.enum(["full-time", "part-time", "contract", "internship", "temporary"])),
  industries: z.array(z.string()),
  workAuthorization: z.string(),
  needsSponsorship: z.boolean(),
});
export type JobPreferences = z.infer<typeof PreferencesSchema>;

export const defaultPreferences = (): JobPreferences => ({
  roles: [],
  seniority: "any",
  seniorities: [],
  locations: [],
  workModes: ["remote", "hybrid", "onsite"],
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "USD",
  employmentTypes: ["full-time"],
  industries: [],
  workAuthorization: "",
  needsSponsorship: false,
});

/** Strip everything the user chose to hide, before it leaves the server. */
export function redactForPublic(r: ResumeData, v: Visibility): ResumeData {
  return {
    ...r,
    email: v.showEmail ? r.email : "",
    phone: v.showPhone ? r.phone : "",
    location: v.showLocation ? r.location : "",
    experience: v.showExperience ? r.experience : [],
    education: v.showEducation ? r.education : [],
    skills: v.showSkills ? r.skills : [],
    projects: v.showProjects ? r.projects : [],
    certifications: v.showCertifications ? r.certifications : [],
    links: v.showLinks ? r.links : [],
  };
}

export const allSkills =(r: ResumeData) => r.skills.flatMap((g) => g.skills);
