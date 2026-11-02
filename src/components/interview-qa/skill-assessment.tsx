"use client";

import { ArrowRight, BrainCircuit, Check, CheckCircle2, ChevronDown, ClipboardPaste, Clock, Copy, Download, ExternalLink, Globe2, Keyboard, Layers, ListOrdered, Loader2, RotateCcw, Sparkles, Timer, TimerOff, Trophy, X, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/components/client";
import { useToast } from "@/components/toast";
import { cx } from "@/lib/format";
import { DIFFICULTIES, googleAssessmentPrompt, LEVELS, LOCALES, localeLabel, OTHER_LOCALE, parsePastedAssessment, QUANTITIES, scoreAssessment, shuffle, SKILL_GROUPS, type AssessmentRequest, type Difficulty, type Level, type McqItem } from "@/lib/interview-qa/assessment";
import { googleAiUrl } from "@/lib/google";

const TONE: Record<Difficulty, string> = { Beginner: "#20c997", Intermediate: "#4263ff", Advanced: "#8457ff" };
const LETTERS = ["A", "B", "C", "D"];
const SECONDS = 60;
const RTL = /^(ar|ur|he|fa)\b|arabic|urdu|hebrew|persian|farsi/i;
const FEATURED = ["Systems Architecture", "SQL", "Financial Modeling", "Situational Judgment", "Kubernetes", "Emotional Intelligence"];

type Setup = { skill: string; locale: string; other: string; difficulty: Level; count: number; timer: boolean };
type Test = { setup: Setup; items: McqItem[] };

const languageOf = (s: Setup) => (s.locale === OTHER_LOCALE ? s.other.trim() || "English" : localeLabel(s.locale));
const langAttr = (s: Setup) => (s.locale === OTHER_LOCALE ? undefined : s.locale);

// --- Skill picker: free text with grouped suggestions -----------------------------------------
function SkillInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const groups = useMemo(() => {
    const q = value.trim().toLowerCase();
    const seen = new Set<string>();
    return SKILL_GROUPS.map((g) => ({ group: g.group, skills: g.skills.filter((s) => !seen.has(s) && seen.add(s) && (!q || s.toLowerCase().includes(q))).slice(0, q ? 8 : 6) })).filter((g) => g.skills.length);
  }, [value]);
  return (
    <div ref={wrap} className="relative">
      <BrainCircuit className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-brand-600" aria-hidden />
      <input
        id="sa-skill"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        maxLength={80}
        required
        autoComplete="off"
        placeholder="Any skill, e.g. Kubernetes, Financial Modeling, Critical Thinking"
        className="input !rounded-2xl !py-3 pl-10"
        role="combobox"
        aria-expanded={open}
        aria-controls="sa-skill-list"
        aria-autocomplete="list"
      />
      {open && groups.length > 0 && (
        <div id="sa-skill-list" role="listbox" className="card menu-in absolute top-full right-0 left-0 z-40 mt-2 max-h-80 overflow-y-auto p-2 shadow-2xl">
          {groups.map((g) => (
            <div key={g.group} className="mb-1">
              <p className="px-2 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-slate-500 uppercase">{g.group}</p>
              <div className="flex flex-wrap gap-1.5 px-1.5 pb-1">
                {g.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={s === value}
                    onClick={() => {
                      onChange(s);
                      setOpen(false);
                    }}
                    className={cx("rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:-translate-y-0.5", s === value ? "border-transparent bg-brand-600 text-white" : "border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-700")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({ options, value, onChange, label, render }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string; render?: (v: T) => React.ReactNode }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1">
      {options.map((o) => (
        <button key={String(o)} type="button" role="radio" aria-checked={o === value} onClick={() => onChange(o)} className={cx("flex-1 rounded-xl px-3 py-2 text-sm font-bold transition", o === value ? "bg-surface text-brand-700 shadow" : "text-slate-600 hover:text-slate-900")}>
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

// --- Setup ----------------------------------------------------------------------------------------
function SetupForm({ initial, onStart }: { initial: Setup; onStart: (t: Test) => void }) {
  const [s, setS] = useState<Setup>(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [paste, setPaste] = useState<string | null>(null);
  const request = () => {
    if (s.skill.trim().length < 2) return void toast("Enter a skill to be assessed on.", "error");
    if (s.locale === OTHER_LOCALE && s.other.trim().length < 2) return void toast("Type the language you want.", "error");
    return { skill: s.skill.trim(), locale: s.locale === OTHER_LOCALE ? s.other.trim() : s.locale, difficulty: s.difficulty, count: s.count as AssessmentRequest["count"] };
  };
  const prompt = () => {
    const r = request();
    return r ? googleAssessmentPrompt(r) : null;
  };
  // Default: Google AI Mode writes the test (no CareerMatch AI action); the answer is pasted back.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = prompt();
    if (!p) return;
    window.open(googleAiUrl(p), "_blank", "noopener,noreferrer");
    setPaste((cur) => cur ?? "");
  };
  const copyPrompt = async () => {
    const p = prompt();
    if (!p) return;
    try {
      await navigator.clipboard.writeText(p);
      toast("Prompt copied. Paste it into Google AI Mode.", "success");
    } catch {
      toast("Couldn't copy. Use the Google AI Mode button instead.", "error");
    }
  };
  const startFromPaste = () => {
    const items = parsePastedAssessment(paste ?? "", s.count);
    if (items.length < Math.min(3, s.count)) return toast("Couldn't find enough complete questions in that text. Copy Google's whole answer (the JSON code block) and paste it again.", "error");
    if (items.length < s.count) toast(`Using the ${items.length} complete questions Google gave (some were skipped by the checks).`, "info");
    onStart({ setup: { ...s, skill: s.skill.trim() }, items });
  };
  // Optional: generate here with CareerMatch AI (uses 1 AI action).
  const generateHere = async () => {
    const r = request();
    if (!r) return;
    setBusy(true);
    try {
      const res = await api<{ items: McqItem[] }>("/api/skill-assessment", { method: "POST", json: r });
      onStart({ setup: { ...s, skill: r.skill }, items: res.items });
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card relative z-20 grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-5">
        <div>
          <label htmlFor="sa-skill" className="label">Skill</label>
          <SkillInput value={s.skill} onChange={(skill) => setS({ ...s, skill })} />
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {FEATURED.map((f) => (
              <button key={f} type="button" onClick={() => setS({ ...s, skill: f })} className={cx("rounded-full px-2.5 py-1 text-[11px] font-bold transition", s.skill === f ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100")}>{f}</button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="sa-locale" className="label flex items-center gap-1.5"><Globe2 className="size-3.5" /> Language and locale</label>
          <div className="relative">
            <select id="sa-locale" className="input !rounded-2xl !py-3 appearance-none pr-10" value={s.locale} onChange={(e) => setS({ ...s, locale: e.target.value })}>
              {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              <option value={OTHER_LOCALE}>Other language or region…</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          </div>
          {s.locale === OTHER_LOCALE && <input autoFocus className="input menu-in mt-2 !rounded-2xl" maxLength={60} value={s.other} onChange={(e) => setS({ ...s, other: e.target.value })} placeholder="e.g. Swahili (Kenya), Malayalam, Swiss German" aria-label="Other language" />}
          <p className="mt-1.5 text-xs text-slate-500">Questions are written and localized for professionals in that locale, not just translated.</p>
        </div>
      </div>
      <div className="space-y-5">
        <div>
          <span className="label flex items-center gap-1.5"><Layers className="size-3.5" /> Difficulty</span>
          <Segmented label="Difficulty" options={LEVELS} value={s.difficulty} onChange={(difficulty) => setS({ ...s, difficulty })} />
        </div>
        <div>
          <span className="label flex items-center gap-1.5"><ListOrdered className="size-3.5" /> Questions</span>
          <Segmented label="Number of questions" options={QUANTITIES} value={s.count as (typeof QUANTITIES)[number]} onChange={(count) => setS({ ...s, count })} />
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">{s.timer ? <Timer className="size-4 text-brand-600" /> : <TimerOff className="size-4 text-slate-400" />} {SECONDS}-second timer per question</span>
          <input type="checkbox" className="size-4 accent-[#4263ff]" checked={s.timer} onChange={(e) => setS({ ...s, timer: e.target.checked })} />
        </label>
        <button disabled={busy} className="btn-primary w-full !py-3 text-base">
          <Sparkles className="size-5" /> Generate with Google AI Mode <ExternalLink className="size-4" />
        </button>
        <p className="text-center text-xs text-slate-500">Opens Google AI Mode in a new tab with a ready-made prompt. It runs on Google, so it doesn&apos;t use your CareerMatch AI actions.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold">
          <button type="button" onClick={copyPrompt} className="flex items-center gap-1 text-brand-700 hover:underline"><Copy className="size-3.5" /> Copy the prompt</button>
          <button type="button" onClick={generateHere} disabled={busy} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:underline">{busy ? <Loader2 className="size-3.5 animate-spin" /> : <BrainCircuit className="size-3.5" />}{busy ? `Writing ${s.count} questions…` : "Or generate here (uses 1 AI action)"}</button>
        </div>
      </div>
      {paste !== null && (
        <div className="menu-in rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-4 lg:col-span-2">
          <p className="flex items-center gap-2 font-display font-bold text-slate-900"><ClipboardPaste className="size-5 text-brand-600" /> Paste Google&apos;s answer to start the test</p>
          <ol className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
            <li><b className="text-brand-700">1.</b> In the Google tab, wait for the answer to finish.</li>
            <li><b className="text-brand-700">2.</b> Click the copy icon on its code block (or select all of it).</li>
            <li><b className="text-brand-700">3.</b> Paste it below and start. We check, shuffle and score it here.</li>
          </ol>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} className="input mt-3 font-mono !text-xs" placeholder={'```json\n{"questions": [ ... ]}\n```'} aria-label="Google AI Mode answer" />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setPaste(null)} className="btn-secondary">Cancel</button>
            <button type="button" onClick={startFromPaste} disabled={!paste?.trim()} className="btn-primary">Start the test <ArrowRight className="size-4" /></button>
          </div>
        </div>
      )}
      {busy && (
        <div className="space-y-2 lg:col-span-2" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-3 animate-pulse rounded-full bg-slate-100" style={{ width: `${90 - i * 18}%` }} />)}
        </div>
      )}
    </form>
  );
}

// --- Taking the test ------------------------------------------------------------------------------
function Runner({ test, onDone, onQuit }: { test: Test; onDone: (answers: (string | null)[]) => void; onQuit: () => void }) {
  const { items, setup } = test;
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>(() => items.map(() => null));
  const [left, setLeft] = useState(SECONDS);
  const it = items[i];
  const last = i === items.length - 1;
  const pick = answers[i];
  const dir = RTL.test(setup.locale === OTHER_LOCALE ? setup.other : setup.locale) ? "rtl" : undefined;

  const next = useCallback(() => {
    if (last) onDone(answers);
    else {
      setI((n) => n + 1);
      setLeft(SECONDS);
    }
  }, [last, answers, onDone]);

  const choose = useCallback((o: string) => setAnswers((cur) => cur.map((a, k) => (k === i ? o : a))), [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && it.options[n - 1]) {
        e.preventDefault();
        choose(it.options[n - 1]);
      } else if (e.key === "Enter" && pick) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [it, pick, choose, next]);

  useEffect(() => {
    if (!setup.timer) return;
    if (left <= 0) {
      next();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, setup.timer, next]);

  const pct = ((i + (pick ? 1 : 0)) / items.length) * 100;
  return (
    <section className="card relative overflow-hidden p-5 sm:p-8" aria-label="Skill assessment">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-700"><span className="text-brand-700">{setup.skill}</span> · Question {i + 1} of {items.length}</p>
        <div className="flex items-center gap-2">
          {setup.timer && (
            <span className={cx("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums", left <= 10 ? "bg-[#ffe9e7] text-[#c4413a]" : "bg-slate-100 text-slate-700")} aria-live={left <= 10 ? "polite" : "off"}>
              <Clock className="size-3.5" /> {left}s
            </span>
          )}
          <button type="button" onClick={onQuit} className="btn-ghost !px-2 !py-1 text-xs"><X className="size-4" /> Quit</button>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={i + (pick ? 1 : 0)} aria-label="Progress">
        <div className="h-full rounded-full bg-gradient-to-r from-[#4263ff] via-[#8457ff] to-[#19c6e8] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {setup.timer && <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-transparent"><div className="h-full bg-[#ffc857] transition-[width] duration-1000 ease-linear" style={{ width: `${(left / SECONDS) * 100}%` }} /></div>}

      <div key={i} className="sa-step mt-6" lang={langAttr(setup)} dir={dir}>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: TONE[it.difficulty] }}>{it.difficulty}</span>
        <h2 className="mt-3 font-display text-xl leading-snug font-bold whitespace-pre-line text-slate-900 sm:text-2xl">{it.question}</h2>
        <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Answer options">
          {it.options.map((o, k) => {
            const on = pick === o;
            return (
              <button key={o} type="button" role="radio" aria-checked={on} onClick={() => choose(o)} className={cx("sa-option group flex items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-start text-[15px] transition", on ? "border-brand-500 bg-brand-50 text-slate-900 shadow-[0_0_0_4px_rgba(66,99,255,0.12)]" : "border-slate-200 text-slate-700 hover:-translate-y-0.5 hover:border-brand-300")} style={{ "--i": k } as React.CSSProperties}>
                <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold transition", on ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-brand-100")}>{on ? <Check className="size-4" /> : k + 1}</span>
                <span className="pt-0.5">{o}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex"><Keyboard className="size-3.5" /> Press 1-4 to choose, Enter to continue</p>
        <div className="ml-auto flex gap-2">
          {!pick && <button type="button" onClick={next} className="btn-secondary">Skip</button>}
          <button type="button" onClick={next} disabled={!pick} className="btn-primary">{last ? "Finish" : "Next"} <ArrowRight className="size-4" /></button>
        </div>
      </div>
    </section>
  );
}

// --- Results --------------------------------------------------------------------------------------
function ScoreRing({ percent }: { percent: number }) {
  const r = 54, c = 2 * Math.PI * r;
  const tone = percent >= 80 ? "#20c997" : percent >= 50 ? "#4263ff" : "#ff716b";
  return (
    <svg viewBox="0 0 128 128" className="size-36 shrink-0 -rotate-90" role="img" aria-label={`Score ${percent}%`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="11" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={tone} strokeWidth="11" strokeLinecap="round" className="sa-ring" style={{ strokeDasharray: c, "--full": c, "--rest": c * (1 - percent / 100) } as React.CSSProperties} />
      <text x="64" y="64" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center" fill="#fff" fontSize="28" fontWeight="800">{percent}%</text>
    </svg>
  );
}

async function download(test: Test, answers: (string | null)[], format: "pdf" | "docx") {
  const res = await fetch("/api/skill-assessment/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format, skill: test.setup.skill, language: languageOf(test.setup), items: test.items, answers }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Skill_Assessment.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Results({ test, answers, onRetake, onNew }: { test: Test; answers: (string | null)[]; onRetake: () => void; onNew: () => void }) {
  const s = scoreAssessment(test.items, answers);
  const toast = useToast();
  const [busy, setBusy] = useState<"" | "pdf" | "docx">("");
  const dir = RTL.test(test.setup.locale === OTHER_LOCALE ? test.setup.other : test.setup.locale) ? "rtl" : undefined;
  const get = async (f: "pdf" | "docx") => {
    setBusy(f);
    try {
      await download(test, answers, f);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };
  const verdict = s.percent >= 80 ? "Strong command of this skill." : s.percent >= 50 ? "Solid foundation, with gaps to close." : "Worth some focused practice.";
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0a1020] p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_260px_at_90%_0%,rgba(132,87,255,0.45),transparent_70%),radial-gradient(420px_260px_at_0%_100%,rgba(25,198,232,0.28),transparent_70%)]" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ScoreRing percent={s.percent} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide uppercase"><Trophy className="size-3.5 text-[#ffc857]" /> {test.setup.skill} · {languageOf(test.setup)}</p>
            <h2 className="mt-3 font-display text-3xl font-bold">{s.correct} of {s.total} correct</h2>
            <p className="mt-1 text-[#c9d0ea]">{verdict}</p>
            <div className="mt-4 grid gap-2 sm:max-w-md">
              {DIFFICULTIES.filter((d) => s.by[d].total).map((d) => (
                <div key={d} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 font-semibold text-[#d5daee]">{d}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><span className="sa-bar block h-full rounded-full" style={{ width: `${(s.by[d].correct / s.by[d].total) * 100}%`, background: TONE[d] }} /></span>
                  <span className="w-10 text-right font-bold tabular-nums">{s.by[d].correct}/{s.by[d].total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          <button onClick={onRetake} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#10152b] transition hover:-translate-y-0.5"><RotateCcw className="size-4" /> Retake</button>
          <button onClick={onNew} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10"><Sparkles className="size-4" /> New test</button>
          <button onClick={() => get("docx")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10">{busy === "docx" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Word</button>
          <button onClick={() => get("pdf")} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold transition hover:bg-white/10">{busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF</button>
        </div>
      </section>

      <section aria-label="Review answers" className="space-y-3">
        <h3 className="font-display text-xl font-bold text-slate-900">Review every question</h3>
        {test.items.map((it, i) => {
          const a = answers[i];
          const ok = a === it.correct_answer;
          return (
            <article key={i} className="iq-card-in card relative overflow-hidden p-5" style={{ "--i": i } as React.CSSProperties} lang={langAttr(test.setup)} dir={dir}>
              <span aria-hidden className="absolute inset-y-0 start-0 w-1.5" style={{ background: ok ? "#20c997" : "#ff716b" }} />
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                {ok ? <span className="flex items-center gap-1 rounded-full bg-[#dff7ee] px-2.5 py-1 text-[#0b7a5a]"><CheckCircle2 className="size-3.5" /> Correct</span> : <span className="flex items-center gap-1 rounded-full bg-[#ffe9e7] px-2.5 py-1 text-[#c4413a]"><XCircle className="size-3.5" /> {a ? "Incorrect" : "Not answered"}</span>}
                <span className="rounded-full px-2.5 py-1 text-white" style={{ background: TONE[it.difficulty] }}>{it.difficulty}</span>
                <span className="ms-auto text-slate-400">{i + 1}/{test.items.length}</span>
              </div>
              <p className="mt-3 font-bold whitespace-pre-line text-slate-900">{it.question}</p>
              <ul className="mt-3 grid gap-1.5 text-sm">
                {it.options.map((o, k) => {
                  const right = o === it.correct_answer;
                  const mine = o === a;
                  return (
                    <li key={o} className={cx("flex items-start gap-2 rounded-xl px-3 py-2", right ? "bg-[#dff7ee] font-semibold text-[#0b5a43]" : mine ? "bg-[#ffe9e7] text-[#9b2f29]" : "text-slate-600")}>
                      <span className="font-bold">{LETTERS[k]}.</span>
                      <span className="flex-1">{o}</span>
                      {right && <Check className="size-4 shrink-0" aria-label="Correct answer" />}
                      {mine && !right && <X className="size-4 shrink-0" aria-label="Your answer" />}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"><b className="text-slate-800">Why: </b>{it.explanation}</p>
            </article>
          );
        })}
      </section>
      <p className="text-center text-xs text-slate-500">AI-generated practice questions for self-assessment. Not an official certification, and not taken from any employer or test provider.</p>
    </div>
  );
}

// --- Tab ------------------------------------------------------------------------------------------
export function SkillAssessment() {
  const [setup, setSetup] = useState<Setup>({ skill: "", locale: "en-US", other: "", difficulty: "Mixed", count: 10, timer: true });
  const [test, setTest] = useState<Test | null>(null);
  const [answers, setAnswers] = useState<(string | null)[] | null>(null);
  const [round, setRound] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div ref={top} className="scroll-mt-24 space-y-6">
      {!test && (
        <>
          <section className="relative overflow-hidden rounded-[2rem] bg-[#0a1020] px-6 py-9 text-white sm:px-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_280px_at_85%_0%,rgba(132,87,255,0.45),transparent_70%),radial-gradient(480px_280px_at_0%_100%,rgba(25,198,232,0.3),transparent_70%)]" />
            {[["A", "84%", "18%", "#19c6e8", "-6deg", "6s"], ["B", "92%", "58%", "#8457ff", "5deg", "7.5s"], ["C", "74%", "70%", "#ffc857", "-4deg", "8s"], ["✓", "66%", "24%", "#20c997", "6deg", "6.5s"]].map(([t, l, top, c, rot, dur]) => (
              <span key={t} aria-hidden className="iq-bob pointer-events-none absolute hidden size-10 place-items-center rounded-xl border border-white/15 text-sm font-extrabold backdrop-blur lg:grid" style={{ left: l, top, background: `${c}33`, color: c, "--rot": rot, "--dur": dur } as React.CSSProperties}>{t}</span>
            ))}
            <div className="relative max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide uppercase"><BrainCircuit className="size-3.5 text-[#ffc857]" /> Skill Assessment</p>
              <h1 className="mt-4 font-serif text-4xl leading-[1.05] font-normal sm:text-5xl">Test yourself on <em className="iq-shimmer italic">any skill.</em></h1>
              <p className="mt-3 text-lg text-[#c9d0ea]">Pick a skill and a language. Google AI Mode writes a scenario-based multiple-choice test, and CareerMatch checks it, scores it instantly and explains every answer.</p>
            </div>
          </section>
          <SetupForm
            initial={setup}
            onStart={(t) => {
              setSetup(t.setup);
              setTest(t);
              setAnswers(null);
              setRound((r) => r + 1);
              scrollTop();
            }}
          />
        </>
      )}
      {test && !answers && (
        <Runner
          key={round}
          test={test}
          onQuit={() => setTest(null)}
          onDone={(a) => {
            setAnswers(a);
            scrollTop();
          }}
        />
      )}
      {test && answers && (
        <Results
          test={test}
          answers={answers}
          onRetake={() => {
            setTest({ ...test, items: test.items.map((it) => ({ ...it, options: shuffle(it.options) })) });
            setAnswers(null);
            setRound((r) => r + 1);
            scrollTop();
          }}
          onNew={() => {
            setTest(null);
            setAnswers(null);
            scrollTop();
          }}
        />
      )}
    </div>
  );
}
