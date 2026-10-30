// Transparent profile scores. Each check contributes to the score and, when
// it fails, becomes a recommended next action.

import { allSkills, type JobPreferences, type ResumeData } from "./resume/schema";

export type Check = { label: string; ok: boolean; weight: number; fix: string; href: string };
export type ScoreReport = { score: number; checks: Check[] };

const report = (checks: Check[]): ScoreReport => {
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  return { score: total ? Math.round((100 * got) / total) : 0, checks };
};

const METRIC = /\d+%|\$\d|\d+[kKmM]\b|\b\d{2,}\b|\bx\d|\d+x\b/;
const ACTION = /^(led|built|designed|developed|launched|created|improved|reduced|increased|managed|owned|shipped|implemented|automated|delivered|drove|architected|mentored|scaled|migrated|optimized|partnered|introduced)/i;

export function resumeHealth(r: ResumeData): ScoreReport {
  const bullets = r.experience.flatMap((e) => e.highlights);
  const withMetrics = bullets.filter((b) => METRIC.test(b)).length;
  const withVerbs = bullets.filter((b) => ACTION.test(b.trim())).length;
  const longBullets = bullets.filter((b) => b.length > 220).length;
  return report([
    { label: "Professional summary (2-4 sentences)", ok: r.summary.length >= 120 && r.summary.length <= 900, weight: 15, fix: "Write a concise 2-4 sentence summary.", href: "/profile#summary" },
    { label: "At least 2 roles with highlights", ok: r.experience.filter((e) => e.highlights.length >= 2).length >= Math.min(2, r.experience.length || 2), weight: 20, fix: "Add 2-5 bullet highlights to each recent role.", href: "/profile#experience" },
    { label: "Quantified achievements in 40%+ of bullets", ok: bullets.length > 0 && withMetrics / bullets.length >= 0.4, weight: 20, fix: "Add numbers (%, $, time saved, users) to more bullets.", href: "/profile#experience" },
    { label: "Bullets start with action verbs", ok: bullets.length > 0 && withVerbs / bullets.length >= 0.6, weight: 15, fix: "Start bullets with verbs like Led, Built, Reduced.", href: "/profile#experience" },
    { label: "Bullets are concise", ok: longBullets === 0, weight: 10, fix: "Trim bullets longer than ~2 lines.", href: "/profile#experience" },
    { label: "Dates on every role", ok: r.experience.length > 0 && r.experience.every((e) => e.startDate && e.endDate), weight: 10, fix: "Add start and end dates to each role.", href: "/profile#experience" },
    { label: "Education listed", ok: r.education.length > 0, weight: 10, fix: "Add your education.", href: "/profile#education" },
  ]);
}

export function atsReadiness(r: ResumeData): ScoreReport {
  const skills = allSkills(r);
  return report([
    { label: "Contact email present", ok: /@/.test(r.email), weight: 15, fix: "Add an email address.", href: "/profile#basics" },
    { label: "Phone number present", ok: r.phone.replace(/\D/g, "").length >= 7, weight: 10, fix: "Add a phone number.", href: "/profile#basics" },
    { label: "Clear headline / target title", ok: r.headline.length >= 4, weight: 15, fix: "Add a headline matching the roles you want.", href: "/profile#basics" },
    { label: "8+ skills listed", ok: skills.length >= 8, weight: 20, fix: "List at least 8 relevant hard skills.", href: "/profile#skills" },
    { label: "Standard job titles and company names", ok: r.experience.length > 0 && r.experience.every((e) => e.title && e.company), weight: 15, fix: "Make sure every role has a title and company.", href: "/profile#experience" },
    { label: "Consistent date format", ok: r.experience.every((e) => /\d{4}/.test(e.startDate)), weight: 10, fix: "Use 'Mon YYYY' dates consistently.", href: "/profile#experience" },
    { label: "Location listed", ok: r.location.length > 1, weight: 15, fix: "Add your city or 'Remote'.", href: "/profile#basics" },
  ]);
}

export function profileCompleteness(r: ResumeData, prefs: JobPreferences, isPublic: boolean): ScoreReport {
  return report([
    { label: "Name and headline", ok: !!r.name && !!r.headline, weight: 15, fix: "Add your name and headline.", href: "/profile#basics" },
    { label: "Summary", ok: r.summary.length > 40, weight: 10, fix: "Add a summary.", href: "/profile#summary" },
    { label: "Experience", ok: r.experience.length > 0, weight: 20, fix: "Add work experience.", href: "/profile#experience" },
    { label: "Skills", ok: allSkills(r).length > 0, weight: 15, fix: "Add skills.", href: "/profile#skills" },
    { label: "Links (LinkedIn, GitHub, portfolio)", ok: r.links.length > 0, weight: 10, fix: "Add a LinkedIn or portfolio link.", href: "/profile#links" },
    { label: "Projects or certifications", ok: r.projects.length + r.certifications.length > 0, weight: 10, fix: "Showcase a project or certification.", href: "/profile#projects" },
    { label: "Job preferences set", ok: prefs.roles.length > 0, weight: 15, fix: "Tell us which roles you want.", href: "/preferences" },
    { label: "Profile published", ok: isPublic, weight: 5, fix: "Publish your profile page to share it.", href: "/profile#publish" },
  ]);
}
