import "server-only";
// Orchestrates the Studio: analyse a job, propose changes, rebuild the
// tailored résumé from accepted changes, write the cover letter. AI is used
// when available; every step has an honest rule-based path that never
// pretends to be AI.

import { AIError, aiEnabled, generateStructuredMeta } from "../ai";
import type { ResumeData } from "../resume/schema";
import { matchAll } from "./evidence";
import type { GuardContext } from "./guard";
import { AiLetterSchema, guardLetter, LETTER_SYSTEM, letterPrompt, ruleBasedLetter, type Length, type Tone } from "./letter";
import { analyseWithRules, AiAnalysisSchema, ANALYSIS_PROMPT, ANALYSIS_VERSION, mergeAiAnalysis } from "./requirements";
import { AiRewriteSchema, applyChanges, changesFromAi, resumeText, REWRITE_SYSTEM, rewritePrompt, ruleBasedActions, ruleBasedChanges } from "./rewrite";
import { scoreResume } from "./score";
import type { TailorState } from "./types";

type Source = TailorState["source"];
type Step<T> = { value: T; engine: string; warning?: string };

const aiFailed = (err: unknown, what: string) => `${err instanceof AIError ? err.message : "The AI request failed."} ${what} used the rule-based method instead.`;

export async function analyseJob(source: Source, useAi: boolean): Promise<Step<TailorState["analysis"]>> {
  const job = { title: source.title, company: source.company, description: source.description };
  if (useAi && aiEnabled()) {
    try {
      const { data: ai, model } = await generateStructuredMeta({
        schema: AiAnalysisSchema,
        effort: "low",
        system: ANALYSIS_PROMPT,
        prompt: `<job_title>${source.title}</job_title>\n<company>${source.company}</company>\n<posting>\n${source.description.slice(0, 20_000)}\n</posting>`,
      });
      return { value: mergeAiAnalysis(job, ai, `${ANALYSIS_VERSION}+${model}`), engine: model };
    } catch (err) {
      return { value: analyseWithRules(job), engine: "rules", warning: aiFailed(err, "The job analysis") };
    }
  }
  return { value: analyseWithRules(job), engine: "rules" };
}

const guardCtx = (s: TailorState): GuardContext => ({ resumeText: resumeText(s.baseResume), allowed: [...s.selected, ...s.learning].map((id) => s.matches.find((m) => m.requirement.id === id)?.requirement.keyword ?? "").filter(Boolean) });

/** Rebuild the tailored résumé and the after-score from the current selections. */
export function recompute(s: TailorState, opts: { visual?: boolean } = {}): TailorState {
  if (!s.analysis) return s;
  const keyword = (id: string) => s.matches.find((m) => m.requirement.id === id)?.requirement.keyword;
  const resume = applyChanges(s.baseResume, s.changes, { selected: s.selected.map(keyword).filter(Boolean) as string[], learning: s.learning.map(keyword).filter(Boolean) as string[], matches: s.matches });
  return withResume(s, resume, opts);
}

/** Score a résumé the user edited by hand (after accepting changes). */
export function withResume(s: TailorState, resume: ResumeData, opts: { visual?: boolean } = {}): TailorState {
  if (!s.analysis) return { ...s, resume };
  return { ...s, resume, scores: { before: s.scores.before ?? scoreResume(s.baseResume, s.analysis), after: scoreResume(resume, s.analysis, opts) } };
}

export async function startState(input: { source: Source; base: ResumeData; baseName: string; useAi: boolean }): Promise<TailorState> {
  const analysis = await analyseJob(input.source, input.useAi);
  const matches = analysis.value ? matchAll(analysis.value.requirements, input.base) : [];
  const before = analysis.value ? scoreResume(input.base, analysis.value, { matches }) : null;
  return {
    source: input.source,
    baseResume: input.base,
    baseName: input.baseName,
    analysis: analysis.value,
    matches,
    // Evidenced keywords are pre-selected; missing ones never are.
    selected: [],
    learning: [],
    changes: [],
    actionPlan: ruleBasedActions(input.base, matches),
    letter: null,
    scores: { before, after: before },
    history: [],
    resume: structuredClone(input.base),
    engine: analysis.engine,
    warnings: analysis.warning ? [analysis.warning] : [],
  };
}

export async function proposeChanges(s: TailorState, useAi: boolean): Promise<TailorState> {
  if (!s.analysis) return s;
  const ctx = guardCtx(s);
  const confirmed = ctx.allowed;
  let engine = "rules";
  const warnings: string[] = [];
  let changes = ruleBasedChanges(s.baseResume, s.analysis, s.matches, ctx);
  let actions = ruleBasedActions(s.baseResume, s.matches);
  if (useAi && aiEnabled()) {
    try {
      const { data: ai, model } = await generateStructuredMeta({ schema: AiRewriteSchema, effort: "medium", system: REWRITE_SYSTEM, prompt: rewritePrompt(s.baseResume, s.analysis, s.matches, confirmed) });
      const fromAi = changesFromAi(s.baseResume, ai, ctx);
      // Keep rule-based edits for bullets the AI left alone.
      const covered = new Set(fromAi.changes.map((c) => `${c.section}:${c.ref?.exp}.${c.ref?.bullet}`));
      changes = [...fromAi.changes, ...changes.filter((c) => !covered.has(`${c.section}:${c.ref?.exp}.${c.ref?.bullet}`))].map((c, i) => ({ ...c, id: `c${i}` }));
      warnings.push(...fromAi.dropped);
      if (ai.actions.length) actions = ai.actions;
      engine = model;
    } catch (err) {
      warnings.push(aiFailed(err, "The rewrite"));
    }
  }
  const next: TailorState = {
    ...s,
    changes,
    actionPlan: actions,
    engine,
    warnings,
    history: [...s.history, { at: new Date().toISOString(), label: "Before suggestions", resume: s.resume }].slice(-20),
  };
  return recompute(next);
}

export async function writeLetter(s: TailorState, tone: Tone, length: Length, useAi: boolean): Promise<TailorState> {
  if (!s.analysis) return s;
  const base = ruleBasedLetter(s.resume, s.analysis, s.matches, tone, length);
  if (useAi && aiEnabled()) {
    try {
      const { data: ai } = await generateStructuredMeta({ schema: AiLetterSchema, effort: "medium", system: LETTER_SYSTEM, prompt: letterPrompt(s.resume, s.analysis, s.matches, s.source.description, tone, length) });
      const { letter, dropped } = guardLetter(ai, { ...guardCtx(s), resumeText: resumeText(s.resume) }, tone, length, s.resume.name);
      if (letter.paragraphs.length >= 2) return { ...s, letter, warnings: dropped };
      return { ...s, letter: base, warnings: [...dropped, "The AI letter didn't pass the accuracy checks, so a rule-based letter is shown."] };
    } catch (err) {
      return { ...s, letter: base, warnings: [aiFailed(err, "The cover letter")] };
    }
  }
  return { ...s, letter: base, warnings: [] };
}
