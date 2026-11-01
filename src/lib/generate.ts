import "server-only";
import { z } from "zod";
import { AIError, aiEnabled, generateStructuredMeta, TRUTHFULNESS_RULES } from "./ai";
import { scoreJob } from "./jobs/rank";
import type { NormalizedJob } from "./jobs/types";
import { allSkills, type JobPreferences, type ResumeData } from "./resume/schema";

export const KINDS = ["match_analysis", "missing_skills", "ats_resume", "cover_letter", "talking_points"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_LABELS: Record<Kind, string> = {
  match_analysis: "Job-match analysis",
  missing_skills: "Missing-skills analysis",
  ats_resume: "ATS-optimized resume",
  cover_letter: "Cover letter",
  talking_points: "Application answers & talking points",
};

const MatchAnalysis = z.object({
  fitScore: z.number().int().describe("0-100 overall fit"),
  verdict: z.string().describe("one-sentence verdict"),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendation: z.string(),
});

const MissingSkills = z.object({
  missing: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(["required", "preferred", "nice-to-have"]),
      howToClose: z.string().describe("concrete way to build or demonstrate it"),
    }),
  ),
  transferable: z.array(z.string()).describe("existing experience that partially covers a gap"),
});

const AtsResume = z.object({
  headline: z.string(),
  summary: z.string(),
  skills: z.array(z.string()).describe("ordered by relevance to the job; only skills the candidate has"),
  experience: z.array(z.object({ title: z.string(), company: z.string(), dates: z.string(), bullets: z.array(z.string()) })),
  education: z.array(z.string()),
  certifications: z.array(z.string()),
  keywordsCovered: z.array(z.string()),
  keywordsNotClaimed: z.array(z.string()).describe("job keywords left out because the candidate doesn't have them"),
});

const CoverLetter = z.object({
  subject: z.string(),
  body: z.string().describe("full letter, plain text paragraphs separated by blank lines"),
});

const TalkingPoints = z.object({
  elevatorPitch: z.string(),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  storiesToPrepare: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
});

export const SCHEMAS = {
  match_analysis: MatchAnalysis,
  missing_skills: MissingSkills,
  ats_resume: AtsResume,
  cover_letter: CoverLetter,
  talking_points: TalkingPoints,
} as const;

export type GenerationOutput = { [K in Kind]: z.infer<(typeof SCHEMAS)[K]> };

const TASKS: Record<Kind, string> = {
  match_analysis: "Assess how well the candidate fits this job. Be candid and specific; cite evidence from the profile.",
  missing_skills: "Identify skills/qualifications the job asks for that the profile doesn't show, rank their importance, and suggest how to close or reframe each gap.",
  ats_resume: "Rewrite the resume to target this job for applicant tracking systems: mirror the job's terminology where truthful, order skills and bullets by relevance, keep standard section names. Keep every role, title, company and date exactly as given.",
  cover_letter: "Write a concise (250-350 words) tailored cover letter in a confident, warm, professional tone. No clichés, no placeholders like [Company] - use the real names. Sign with the candidate's name.",
  talking_points: "Prepare the candidate to apply: an elevator pitch, answers to 4-6 likely application/screening questions (including 'Why this company?'), STAR stories to prepare, and smart questions to ask.",
};

function profileForPrompt(r: ResumeData, prefs: JobPreferences) {
  return JSON.stringify({ ...r, preferences: { roles: prefs.roles, workAuthorization: prefs.workAuthorization, needsSponsorship: prefs.needsSponsorship } });
}

export async function generate<K extends Kind>(
  kind: K,
  resume: ResumeData,
  prefs: JobPreferences,
  job: NormalizedJob,
): Promise<{ content: GenerationOutput[K]; engine: string; warning?: string }> {
  if (aiEnabled()) {
    try {
      const { data: content, model } = await generateStructuredMeta({
        schema: SCHEMAS[kind],
        effort: kind === "ats_resume" || kind === "cover_letter" ? "high" : "medium",
        system: `You are an expert career coach and resume writer helping a candidate apply for a specific job.\n\n${TRUTHFULNESS_RULES}`,
        prompt: `Task: ${TASKS[kind]}\n\n<candidate_profile>\n${profileForPrompt(resume, prefs)}\n</candidate_profile>\n\n<job>\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location} (${job.workMode})\n\n${job.description.slice(0, 30_000)}\n</job>`,
      });
      return { content: content as GenerationOutput[K], engine: model };
    } catch (err) {
      const msg = err instanceof AIError ? err.message : "AI generation failed.";
      return { content: template(kind, resume, prefs, job), engine: "template", warning: `${msg} Showing a template-based draft instead.` };
    }
  }
  return {
    content: template(kind, resume, prefs, job),
    engine: "template",
    warning: "AI is not configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY). This is a rule-based draft built only from your profile and the posting.",
  };
}

// ---------------------------------------------------------------------------
// Template fallbacks: deterministic and built strictly from the user's data.

function template<K extends Kind>(kind: K, r: ResumeData, prefs: JobPreferences, job: NormalizedJob): GenerationOutput[K] {
  const m = scoreJob(job, r, prefs);
  const company = job.company.replace(/\s*\(sample\)$/, "");
  const recent = r.experience[0];
  const topBullets = r.experience.flatMap((e) => e.highlights).filter((b) => m.matched.some((s) => b.toLowerCase().includes(s.toLowerCase()))).slice(0, 3);

  const out: { [K in Kind]: () => GenerationOutput[K] } = {
    match_analysis: () => ({
      fitScore: m.score,
      verdict: m.score >= 70 ? "Strong fit - worth prioritising." : m.score >= 50 ? "Reasonable fit with some gaps." : "Stretch role - several requirements aren't evident on your profile.",
      strengths: [...m.reasons, ...m.matched.slice(0, 6).map((s) => `Has ${s}`)],
      gaps: m.concerns,
      recommendation: m.missing.length ? `Address ${m.missing.slice(0, 3).join(", ")} in your application if you have relevant experience not yet on your profile.` : "Lead with your most relevant achievements and apply.",
    }),
    missing_skills: () => ({
      missing: m.missing.map((skill, i) => ({
        skill,
        importance: i < 3 ? "required" as const : "preferred" as const,
        howToClose: `If you've used ${skill}, add it to your profile with a concrete example. Otherwise consider a short project or course to demonstrate it.`,
      })),
      transferable: m.matched.slice(0, 5).map((s) => `${s} experience may transfer to adjacent requirements.`),
    }),
    ats_resume: () => {
      const skills = [...m.matched, ...allSkills(r).filter((s) => !m.matched.includes(s))];
      return {
        headline: r.headline || job.title,
        summary: r.summary,
        skills,
        experience: r.experience.map((e) => ({
          title: e.title,
          company: e.company,
          dates: [e.startDate, e.endDate].filter(Boolean).join(" – "),
          // most job-relevant bullets first
          bullets: [...e.highlights].sort((a, b) => relevance(b, m.matched) - relevance(a, m.matched)),
        })),
        education: r.education.map((e) => [e.degree, e.field, e.school, e.endDate].filter(Boolean).join(", ")),
        certifications: r.certifications.map((c) => [c.name, c.issuer, c.date].filter(Boolean).join(", ")),
        keywordsCovered: m.matched,
        keywordsNotClaimed: m.missing,
      };
    },
    cover_letter: () => ({
      subject: `Application for ${job.title} – ${r.name}`,
      body: [
        `Dear ${company} hiring team,`,
        `I'm applying for the ${job.title} role. ${recent ? `As ${/^[aeiou]/i.test(recent.title) ? "an" : "a"} ${recent.title} at ${recent.company}, ` : ""}I've built experience in ${m.matched.slice(0, 4).join(", ") || "the areas this role focuses on"}, which lines up closely with what you're looking for.`,
        topBullets.length ? `A few highlights that are relevant here:\n${topBullets.map((b) => `• ${b}`).join("\n")}` : r.summary,
        `I'd welcome the chance to discuss how I can contribute to ${company}. Thank you for your time and consideration.`,
        `Sincerely,\n${r.name}`,
      ].filter(Boolean).join("\n\n"),
    }),
    talking_points: () => ({
      elevatorPitch: `${r.headline || recent?.title || "Professional"}${recent ? ` currently at ${recent.company}` : ""} with experience in ${m.matched.slice(0, 3).join(", ") || allSkills(r).slice(0, 3).join(", ")}. ${r.summary.split(". ")[0] ?? ""}`.trim(),
      answers: [
        { question: `Why are you interested in ${company}?`, answer: `Draft: connect the ${job.title} responsibilities to your work on ${m.matched.slice(0, 2).join(" and ") || "similar problems"}, and mention something specific about ${company} you researched.` },
        { question: "Tell us about a relevant accomplishment.", answer: topBullets[0] ?? recent?.highlights[0] ?? "Pick your most quantified achievement and walk through it using STAR." },
        { question: "Are you authorized to work in this location?", answer: prefs.workAuthorization || "Answer accurately based on your work authorization status." },
      ],
      storiesToPrepare: (topBullets.length ? topBullets : r.experience.flatMap((e) => e.highlights).slice(0, 3)).map((b) => `STAR story: ${b}`),
      questionsToAsk: ["What does success look like in the first 90 days?", "What are the biggest challenges the team is facing?", "How is the team structured and how do you collaborate?"],
    }),
  };
  return out[kind]();
}

const relevance = (text: string, skills: string[]) => skills.filter((s) => text.toLowerCase().includes(s.toLowerCase())).length;
