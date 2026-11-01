"use client";

import { Briefcase, Building2, CalendarCheck2, ChevronDown, Code2, Database, Download, ExternalLink, FileText, Filter, Layers, Loader2, MessageSquarePlus, Search, Sparkles, Tag, Wrench, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/components/client";
import { useToast } from "@/components/toast";
import { cx } from "@/lib/format";
import type { InterviewQ } from "@/lib/interview-qa/store";
import { ALL_DEPARTMENTS, DEPARTMENT_NAMES, DEPARTMENTS, QUESTION_TYPES, skillsFor, TOOLS } from "@/lib/interview-qa/taxonomy";
import { ChatWidget } from "./chat-widget";
import { Markdown } from "./markdown";
import { MultiSelect } from "./multi-select";

type Facets = { total: number; departments: Record<string, number>; roles: Record<string, number>; tools: Record<string, number>; skills: Record<string, number>; companies: Record<string, number>; types: Record<string, number> };
type Data = { total: number; items: InterviewQ[]; pageSize: number; facets: Facets; overall: number };
type Filters = { dept: string[]; role: string[]; tool: string[]; skill: string[]; company: string[]; type: string[]; q: string };

const TYPE_TONE: Record<string, string> = { Coding: "#4263ff", SQL: "#0891b2", "System Design": "#8457ff", Conceptual: "#4735b5", Behavioral: "#e8553f", Case: "#d99a00" };
const KEYS = ["dept", "role", "tool", "skill", "company", "type"] as const;

const monthYear = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "");

function toQuery(f: Filters, page = 0) {
  const sp = new URLSearchParams();
  for (const k of KEYS) for (const v of f[k]) sp.append(k, v);
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (page) sp.set("page", String(page));
  return sp.toString();
}

// --- Practice gateways, chosen by the active filters ------------------------------------
type Gate = { label: string; href: string; note: string; when: (f: Filters) => boolean; tone: string };
const isTech = (f: Filters) => f.dept.some((d) => d === "Engineering & Technology" || d === "Data & Analytics") || f.type.some((t) => ["Coding", "SQL", "System Design"].includes(t));
const GATES: Gate[] = [
  { label: "Solve SQL & coding problems on LeetCode", href: "https://leetcode.com/problemset/", note: "SQL 50 and coding interview sets", when: (f) => f.tool.includes("SQL") || isTech(f), tone: "#ffa116" },
  { label: "Practise data analytics on StrataScratch", href: "https://www.stratascratch.com/", note: "Real data-science and SQL challenges", when: (f) => f.tool.includes("SQL") || f.dept.includes("Data & Analytics"), tone: "#0891b2" },
  { label: "Practise coding challenges on HackerRank", href: "https://www.hackerrank.com/", note: "Language tracks and skill certifications", when: isTech, tone: "#20c997" },
  { label: "Review core tech concepts on InterviewBit", href: "https://www.interviewbit.com/", note: "Topic-wise programming and system design", when: isTech, tone: "#4263ff" },
  { label: "Practise on GeeksforGeeks", href: "https://www.geeksforgeeks.org/", note: "DSA, CS fundamentals and company archives", when: isTech, tone: "#2f8d46" },
  { label: "Earn badges on Salesforce Trailhead", href: "https://trailhead.salesforce.com/", note: "Apex, SOQL and admin trails", when: (f) => f.tool.includes("Salesforce") || f.dept.includes("Sales & Business Development"), tone: "#00a1e0" },
  { label: "Learn Power BI and Excel on Microsoft Learn", href: "https://learn.microsoft.com/training/powerplatform/power-bi", note: "Free DAX, modelling and Excel modules", when: (f) => f.tool.some((t) => t === "Power BI" || t === "Excel"), tone: "#f2c811" },
  { label: "Free SAP courses on SAP Learning", href: "https://learning.sap.com/", note: "MM, SD, FI/CO and S/4HANA", when: (f) => f.tool.includes("SAP") || f.dept.includes("Supply Chain & Procurement"), tone: "#0a6ed1" },
  { label: "Free Tableau training", href: "https://www.tableau.com/learn/training", note: "Calculations, LOD and dashboards", when: (f) => f.tool.includes("Tableau"), tone: "#e8762d" },
  { label: "Simulate mock interviews on Prepfully", href: "https://prepfully.com/", note: "Practise with interviewers from top firms", when: (f) => !isTech(f) || f.type.includes("Behavioral"), tone: "#7c3aed" },
  { label: "Master corporate & PM cases on IGotAnOffer", href: "https://igotanoffer.com/", note: "Consulting, PM and case frameworks", when: (f) => f.dept.some((d) => ["Business Analysis & Strategy", "Product & Design", "Finance, Legal & Operations"].includes(d)) || f.type.includes("Case"), tone: "#ff716b" },
];

function googleSite(site: string, f: Filters) {
  const terms = [f.company[0], f.role[0] ?? f.dept[0], f.tool[0], f.q].filter(Boolean).join(" ") || "interview";
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${terms} interview questions`)}`;
}
const LOOKUPS: [string, string][] = [["Glassdoor", "glassdoor.com"], ["LinkedIn", "linkedin.com"], ["Indeed", "indeed.com"], ["Blind", "teamblind.com"], ["levels.fyi", "levels.fyi"], ["GeeksforGeeks experiences", "geeksforgeeks.org/interview-experiences"]];

// --- Question card -------------------------------------------------------------------------
function QuestionCard({ q, index, onAnswer }: { q: InterviewQ; index: number; onAnswer: (id: string, answer: string, origin: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const tone = TYPE_TONE[q.questionType] ?? "#4263ff";
  const [title, ...rest] = q.question.split("\n");
  const detail = rest.join("\n").trim();
  const user = q.source === "user";
  const draft = async () => {
    setBusy(true);
    try {
      const r = await api<{ answer: string; answerOrigin: string }>(`/api/interview-qa/${encodeURIComponent(q.id)}/answer`, { method: "POST" });
      onAnswer(q.id, r.answer, r.answerOrigin);
      setOpen(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="iq-card-in card card-hover relative flex flex-col overflow-hidden p-5" style={{ "--i": index % 24 } as React.CSSProperties}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: `linear-gradient(${tone}, ${tone}55)` }} />
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        <span className="rounded-full px-2.5 py-1 text-white" style={{ background: tone }}>{q.questionType}</span>
        {q.company && <span className="flex items-center gap-1 rounded-full bg-[#10152b] px-2.5 py-1 text-white"><Building2 className="size-3" />{q.company}</span>}
        {q.experienceLevel && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{q.experienceLevel}</span>}
        {q.roundType?.includes(" · ") && <span className="rounded-full bg-[#fff1d6] px-2.5 py-1 text-[#8a5a00]">{q.roundType.split(" · ")[1]}</span>}
        <span className={cx("ml-auto flex items-center gap-1 rounded-full px-2.5 py-1", user ? "bg-[#dff7ee] text-[#0b7a5a]" : "bg-brand-50 text-brand-700")} title={user ? "Reported by a user and reviewed" : "Last update of the source collection"}>
          <CalendarCheck2 className="size-3" />
          {user ? `Asked: ${monthYear(q.dateAsked)}` : `Updated: ${monthYear(q.sourceUpdatedAt)}`}
        </span>
      </div>
      <h3 className="mt-3 font-display text-[17px] leading-snug font-bold text-slate-900">{title}</h3>
      {detail && <div className="mt-1 text-sm"><Markdown text={detail} /></div>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {q.roles.slice(0, 2).map((r) => <span key={r} className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600"><Briefcase className="size-3" />{r}</span>)}
        {q.tools.map((t) => <span key={t} className="flex items-center gap-1 rounded-full bg-[#fff1d1] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]"><Wrench className="size-3" />{t}</span>)}
        {q.skills.slice(0, 3).map((s) => <span key={s} className="rounded-full bg-[#e9e4ff] px-2 py-0.5 text-[11px] font-semibold text-[#4735b5]">{s}</span>)}
      </div>
      <div className="mt-4 border-t border-slate-200 pt-3">
        {q.answer ? (
          <>
            <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-sm font-bold text-brand-700">
              <span className="flex items-center gap-1.5">{q.answerOrigin === "ai" ? <Sparkles className="size-4" /> : <FileText className="size-4" />}{open ? "Hide answer" : "Show suggested answer"}</span>
              <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div className="menu-in mt-2">
                {q.answerOrigin === "ai" && <p className="mb-2 rounded-lg bg-[#e9e4ff] px-2.5 py-1.5 text-xs font-semibold text-[#4735b5]">{q.questionType === "Behavioral" ? "Sample STAR answer (AI-drafted, illustrative). Swap in a story from your own experience." : "AI-drafted answer. Check it, and use your own examples."}</p>}
                {q.answerOrigin === "user" && <p className="mb-2 rounded-lg bg-[#dff7ee] px-2.5 py-1.5 text-xs font-semibold text-[#0b7a5a]">Answer shared by the person who was asked.</p>}
                <Markdown text={q.answer} />
              </div>
            )}
          </>
        ) : (
          <button onClick={draft} disabled={busy} className="btn-secondary w-full !py-2 text-sm">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4 text-brand-600" />}
            {busy ? "Drafting a model answer…" : q.questionType === "Behavioral" ? "Draft a STAR answer framework with AI" : "Draft a model answer with AI"}
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        {user ? "Reported by a CareerMatch user" : <>Source: <a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 hover:text-brand-700 hover:underline">{q.attribution}</a></>}
      </p>
    </article>
  );
}

// --- Report form -----------------------------------------------------------------------------
function ReportDialog({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ question: "", company: "", department: DEPARTMENT_NAMES[0], role: "", type: "Behavioral", roundType: "", askedOn: new Date().toISOString().slice(0, 7), answer: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/interview-qa/report", { method: "POST", json: { ...form, company: form.company || undefined, role: form.role || undefined, roundType: form.roundType || undefined, answer: form.answer || undefined } });
      toast("Thanks! Your question will appear once it's reviewed.", "success");
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0b1020]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="report-title" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card menu-in max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="report-title" className="font-display text-xl font-bold">Report a question you were asked</h2>
            <p className="mt-1 text-sm text-slate-600">Real questions only. Reports are reviewed before they&apos;re published, with the month you were asked.</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close"><X className="size-5" /></button>
        </div>
        <label className="block"><span className="label">Question</span><textarea required minLength={15} maxLength={1500} rows={3} className="input" value={form.question} onChange={set("question")} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Company</span><input className="input" maxLength={80} value={form.company} onChange={set("company")} placeholder="e.g. Deloitte" /></label>
          <label><span className="label">Month asked</span><input type="month" required className="input" value={form.askedOn} max={new Date().toISOString().slice(0, 7)} onChange={set("askedOn")} /></label>
          <label><span className="label">Department</span><select className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, role: "" })}>{[...DEPARTMENT_NAMES, ALL_DEPARTMENTS].map((d) => <option key={d}>{d}</option>)}</select></label>
          <label><span className="label">Role</span><select className="input" value={form.role} onChange={set("role")}><option value="">Any role</option>{(DEPARTMENTS[form.department] ?? []).map((r) => <option key={r}>{r}</option>)}</select></label>
          <label><span className="label">Question type</span><select className="input" value={form.type} onChange={set("type")}>{QUESTION_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label><span className="label">Round</span><select className="input" value={form.roundType} onChange={set("roundType")}><option value="">Not sure</option>{["Screening", "HR", "Technical", "Behavioral", "Case", "Final"].map((r) => <option key={r}>{r}</option>)}</select></label>
        </div>
        <label className="block"><span className="label">Your answer or what they looked for (optional)</span><textarea rows={3} maxLength={5000} className="input" value={form.answer} onChange={set("answer")} /></label>
        <button disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : "Submit for review"}</button>
      </form>
    </div>
  );
}

// --- Page --------------------------------------------------------------------------------------
export function InterviewQa({ initial }: { initial: Data }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const fromUrl = useCallback((): Filters => ({ dept: sp.getAll("dept"), role: sp.getAll("role"), tool: sp.getAll("tool"), skill: sp.getAll("skill"), company: sp.getAll("company"), type: sp.getAll("type"), q: sp.get("q") ?? "" }), [sp]);
  const [f, setF] = useState<Filters>(fromUrl);
  const [data, setData] = useState<Data>(initial);
  const [items, setItems] = useState<InterviewQ[]>(initial.items);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(false);
  const [qInput, setQInput] = useState(f.q);
  const first = useRef(true);

  // Header search navigates here with new params: adopt them.
  useEffect(() => {
    const next = fromUrl();
    setF((cur) => (toQuery(cur) === toQuery(next) ? cur : next));
    setQInput(next.q);
  }, [fromUrl]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (toQuery(f) === "") return;
    }
    const qs = toQuery(f);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    let live = true;
    setLoading(true);
    fetch(`/api/interview-qa?${qs}`)
      .then((r) => r.json())
      .then((d: Data) => {
        if (!live) return;
        setData(d);
        setItems(d.items);
        setPage(0);
      })
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  // Debounced keyword search.
  useEffect(() => {
    if (qInput === f.q) return;
    const t = setTimeout(() => setF((cur) => ({ ...cur, q: qInput })), 350);
    return () => clearTimeout(t);
  }, [qInput, f.q]);

  const more = async () => {
    setLoading(true);
    const d = (await (await fetch(`/api/interview-qa?${toQuery(f, page + 1)}`)).json()) as Data;
    setItems((cur) => [...cur, ...d.items]);
    setPage((p) => p + 1);
    setLoading(false);
  };

  const fc = data.facets;
  const roleOptions = useMemo(() => {
    const depts = f.dept.length ? f.dept : DEPARTMENT_NAMES;
    return depts.flatMap((d) => (DEPARTMENTS[d] ?? []).map((r) => ({ value: r, group: d, count: fc.roles[r] ?? 0 })));
  }, [f.dept, fc.roles]);
  const skillOptions = useMemo(() => skillsFor(f.dept).flatMap((c) => c.skills.map((s) => ({ value: s, group: c.cluster, count: fc.skills[s] ?? 0 }))), [f.dept, fc.skills]);
  const companyOptions = useMemo(() => Object.entries(fc.companies).map(([value, count]) => ({ value, count })), [fc.companies]);
  const active = KEYS.reduce((n, k) => n + f[k].length, 0) + (f.q ? 1 : 0);
  const gates = [...GATES].sort((a, b) => Number(b.when(f)) - Number(a.when(f)));
  const qs = toQuery(f);
  const withAnswers = items.filter((q) => q.answer).length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0a1020] px-6 py-10 text-white sm:px-10 lg:py-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_85%_0%,rgba(132,87,255,0.45),transparent_70%),radial-gradient(500px_300px_at_0%_100%,rgba(25,198,232,0.3),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_80%_at_50%_30%,#000,transparent)]" />
        {[["SQL", "12%", "18%", "#19c6e8", "-6deg", "6s"], ["STAR", "78%", "14%", "#ff716b", "5deg", "7.5s"], ["System Design", "68%", "70%", "#8457ff", "-4deg", "8s"], ["React", "88%", "52%", "#4263ff", "7deg", "6.5s"], ["DAX", "4%", "78%", "#ffc857", "4deg", "9s"]].map(([t, l, top, c, rot, dur]) => (
          <span key={t} aria-hidden className="iq-bob pointer-events-none absolute hidden rounded-full border border-white/15 px-3 py-1 text-xs font-bold backdrop-blur lg:block" style={{ left: l, top, background: `${c}33`, color: c, "--rot": rot, "--dur": dur } as React.CSSProperties}>{t}</span>
        ))}
        <div className="relative max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide uppercase"><Sparkles className="size-3.5 text-[#ffc857]" /> Interview Q&amp;A</p>
          <h1 className="mt-4 font-serif text-5xl leading-[1.02] font-normal tracking-[-0.01em] sm:text-6xl">Real interview questions, <em className="iq-shimmer italic">answered.</em></h1>
          <p className="mt-4 max-w-2xl text-lg text-[#c9d0ea]">Searchable by department, role, tool and skill. Every question links to its source; behavioural answers use STAR; and you can download any set as Word or PDF.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {[[String(data.overall), "questions"], [String(Object.keys(fc.companies).length), "companies named"], [String(Object.keys(fc.types).length), "question types"]].map(([n, l]) => (
              <span key={l} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2"><b className="font-display text-xl text-white">{n}</b> <span className="text-[#aab3d1]">{l}</span></span>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="card relative z-20 p-4 sm:p-5" aria-label="Filters">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-72">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search questions, e.g. window functions, conflict, closures…" className="input !rounded-2xl !py-2.5 pl-10" aria-label="Search questions" />
          </label>
          <div className="flex items-center gap-2">
            <a href={`/api/interview-qa/export?format=docx${qs ? `&${qs}` : ""}`} className="btn-secondary !py-2.5"><Download className="size-4" /> Word</a>
            <a href={`/api/interview-qa/export?format=pdf${qs ? `&${qs}` : ""}`} className="btn-secondary !py-2.5"><Download className="size-4" /> PDF</a>
            <button onClick={() => setReport(true)} className="btn-primary !py-2.5"><MessageSquarePlus className="size-4" /> Report a question</button>
          </div>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          <MultiSelect label="Department" icon={Layers} tone="#4263ff" options={DEPARTMENT_NAMES.map((d) => ({ value: d, count: (fc.departments[d] ?? 0) + (fc.departments[ALL_DEPARTMENTS] ?? 0) }))} selected={f.dept} onChange={(dept) => setF({ ...f, dept, role: f.role.filter((r) => !dept.length || dept.some((d) => DEPARTMENTS[d]?.includes(r))) })} />
          <MultiSelect label="Job role" icon={Briefcase} tone="#8457ff" options={roleOptions} selected={f.role} onChange={(role) => setF({ ...f, role })} />
          <MultiSelect label="Tools" icon={Wrench} tone="#d99a00" options={TOOLS.map((t) => ({ value: t.name, count: fc.tools[t.name] ?? 0 }))} selected={f.tool} onChange={(tool) => setF({ ...f, tool })} />
          <MultiSelect label="Skills" icon={Tag} tone="#0891b2" options={skillOptions} selected={f.skill} onChange={(skill) => setF({ ...f, skill })} placeholder="Type a skill…" />
          <MultiSelect label="Company" icon={Building2} tone="#10152b" options={companyOptions} selected={f.company} onChange={(company) => setF({ ...f, company })} placeholder="Type a company…" disabledHint="No company-attributed questions in this selection yet" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-slate-500"><Filter className="size-3.5" /> Type</span>
          {QUESTION_TYPES.map((t) => {
            const on = f.type.includes(t);
            const n = fc.types[t] ?? 0;
            return (
              <button key={t} onClick={() => setF({ ...f, type: on ? f.type.filter((x) => x !== t) : [...f.type, t] })} aria-pressed={on} className={cx("rounded-full px-3 py-1 text-xs font-bold transition", on ? "text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200")} style={on ? { background: TYPE_TONE[t] } : undefined}>
                {t} <span className="opacity-70">{n}</span>
              </button>
            );
          })}
          {active > 0 && <button onClick={() => { setQInput(""); setF({ dept: [], role: [], tool: [], skill: [], company: [], type: [], q: "" }); }} className="ml-auto text-xs font-bold text-rose-600 hover:underline">Clear all filters</button>}
        </div>
      </section>

      {/* Results */}
      <section aria-live="polite">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-slate-600"><b className="font-display text-2xl text-slate-900">{data.total}</b> questions{withAnswers ? ` · ${withAnswers} of the first ${items.length} have answers` : ""}{loading && <Loader2 className="ml-2 inline size-4 animate-spin text-brand-600" />}</p>
          <p className="text-xs text-slate-500">Collections refresh every few days; user reports appear after review.</p>
        </div>
        {items.length === 0 && !loading ? (
          <div className="card grid place-items-center gap-3 p-10 text-center">
            <Database className="size-10 text-slate-300" />
            <p className="max-w-lg text-slate-600">No questions in our bank match this yet. Ask the coach (bottom right) in live-web mode, look up recent reports below, or report one you were asked.</p>
          </div>
        ) : (
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,26rem),1fr))]">
            {items.map((q, i) => <QuestionCard key={q.id} q={q} index={i} onAnswer={(id, answer, answerOrigin) => setItems((cur) => cur.map((x) => (x.id === id ? { ...x, answer, answerOrigin } : x)))} />)}
          </div>
        )}
        {items.length < data.total && (
          <div className="mt-6 text-center"><button onClick={more} disabled={loading} className="btn-secondary !px-6">{loading ? "Loading…" : `Show more (${data.total - items.length} left)`}</button></div>
        )}
      </section>

      {/* Find recent company-specific questions */}
      <section className="card p-6">
        <h2 className="font-display text-xl font-bold text-slate-900">Find recent questions for {f.company[0] ?? f.role[0] ?? f.dept[0] ?? "your target role"}</h2>
        <p className="mt-1 text-sm text-slate-600">These sites hold first-hand interview reports. We link to their latest results instead of copying them.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {LOOKUPS.map(([label, site]) => (
            <a key={site} href={googleSite(site, f)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700">{label} <ExternalLink className="size-3.5" /></a>
          ))}
        </div>
      </section>

      {/* Practice hub */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#10152b] via-[#1a2160] to-[#232b7a] p-6 text-white sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Code2 className="size-6" /></span>
          <div>
            <h2 className="font-display text-2xl font-bold">Practice Hub</h2>
            <p className="text-sm text-[#c9d0ea]">{active ? "Picked for your filters first." : "Hands-on practice on trusted platforms."}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {gates.map((g) => {
            const hot = active > 0 && g.when(f);
            return (
              <a key={g.href} href={g.href} target="_blank" rel="noopener noreferrer" className={cx("group relative rounded-2xl border p-4 transition hover:-translate-y-1", hot ? "border-white/40 bg-white/15" : "border-white/10 bg-white/5 hover:bg-white/10")}>
                <span aria-hidden className="absolute top-4 right-4 size-2.5 rounded-full" style={{ background: g.tone, boxShadow: `0 0 12px ${g.tone}` }} />
                {hot && <span className="mb-2 inline-block rounded-full bg-[#ffc857] px-2 py-0.5 text-[10px] font-bold text-[#4a3000]">Recommended</span>}
                <p className="pr-6 font-bold">{g.label}</p>
                <p className="mt-1 text-xs text-[#aab3d1]">{g.note}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white/90 group-hover:underline">Open <ExternalLink className="size-3" /></span>
              </a>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-slate-500">Questions come from openly licensed collections (MIT and CC BY 4.0, credited on every card) and reviewed user reports. Practice links go to external sites.</p>
      {report && <ReportDialog onClose={() => setReport(false)} />}
      <ChatWidget />
    </div>
  );
}
