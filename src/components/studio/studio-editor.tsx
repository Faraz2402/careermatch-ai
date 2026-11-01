"use client";

import { ArrowLeft, Briefcase, Check, ChevronDown, ChevronUp, Download, FileText, Gauge, LayoutTemplate, Lightbulb, Mail, Minus, Palette, PenLine, Plus, Redo2, Tags, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import type { ResumeData } from "@/lib/resume/schema";
import type { DraftView, StoredState } from "@/lib/tailor/drafts";
import { GROUP_LABELS, STATUS_LABELS, type AlignmentScore, type KeywordMatch, type ReqGroup } from "@/lib/tailor/types";
import { templateById, type PersonalField, showsPhoto } from "@/lib/templates/catalog";
import { ACCENTS, buildDoc, styledTemplate, type SectionKey } from "@/lib/templates/model";
import { Alert, api } from "../client";
import { useToast } from "../toast";
import { ModeBadge, TemplateGallery, TierBadge } from "./template-gallery";
import { TemplateCanvas } from "./template-canvas";

type Tab = "job" | "templates" | "keywords" | "suggestions" | "content" | "letter" | "score" | "design" | "export";
const TABS: { id: Tab; label: string; icon: typeof Tags }[] = [
  { id: "job", label: "Job", icon: Briefcase },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "keywords", label: "Keywords", icon: Tags },
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
  { id: "content", label: "Content", icon: PenLine },
  { id: "letter", label: "Cover letter", icon: Mail },
  { id: "score", label: "ATS score", icon: Gauge },
  { id: "design", label: "Design", icon: Palette },
  { id: "export", label: "Download", icon: Download },
];

export const SCORE_DISCLAIMER = "Estimated ATS Alignment compares your résumé with this job description using a published method. It isn't an employer's ATS score, and a higher number doesn't guarantee an interview — real systems differ.";
const STATUS_STYLE: Record<KeywordMatch["status"], string> = { exact: "bg-emerald-500/15 text-emerald-500", equivalent: "bg-teal-500/15 text-teal-500", partial: "bg-amber-500/15 text-amber-500", missing: "bg-rose-500/15 text-rose-500", unclear: "bg-zinc-500/15 text-zinc-500" };
const PRIORITY_STYLE = { required: "bg-rose-500/15 text-rose-500", recommended: "bg-amber-500/15 text-amber-500", optional: "bg-zinc-500/15 text-zinc-500" };
const FIELD_LABELS: Record<PersonalField, string> = { nationality: "Nationality", visaStatus: "Visa / work status", noticePeriod: "Notice period", dateOfBirth: "Date of birth", maritalStatus: "Marital status", languages: "Languages", drivingLicence: "Driving licence", references: "References" };

export type StudioJob = { id: string | null; title: string; company: string; description: string };

export function StudioEditor({ initial, canUsePro, onBack, backLabel = "Back to job description" }: { initial: DraftView; canUsePro: boolean; onBack?: () => void; backLabel?: string }) {
  const toast = useToast();
  const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState<Tab>(initial.state.changes.length ? "suggestions" : "keywords");
  const [view, setView] = useState<"resume" | "letter">("resume");
  const [zoom, setZoom] = useState(0.8);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLElement>(null);
  // Start zoomed to fit the canvas width.
  useEffect(() => {
    const w = canvasRef.current?.clientWidth;
    if (w) setZoom(Math.max(0.4, Math.min(1, Math.floor(((w - 64) / 800) * 20) / 20)));
  }, []);
  const undo = useRef<ResumeData[]>([]);
  const redo = useRef<ResumeData[]>([]);
  const s = draft.state;
  const template = styledTemplate(templateById(draft.templateId), s.design);
  const doc = useMemo(() => buildDoc(s.resume, template, s.personal, { order: s.design?.order, photo: s.photo }), [s.resume, template, s.personal, s.design?.order, s.photo]);

  const patch = useCallback(
    async (body: Record<string, unknown>, label?: string) => {
      setError("");
      if (label) setBusy(label);
      try {
        const next = await api<DraftView>(`/api/studio/drafts/${draft.id}`, { method: "PATCH", json: body });
        setDraft(next);
        return next;
      } catch (e) {
        setError((e as Error).message);
      } finally {
        if (label) setBusy(null);
      }
    },
    [draft.id],
  );

  async function action(path: "suggest" | "letter", body: Record<string, unknown> = {}, label = "Working…") {
    setBusy(label);
    setError("");
    try {
      const next = await api<DraftView>(`/api/studio/drafts/${draft.id}/${path}`, { method: "POST", json: body });
      setDraft(next);
      if (path === "suggest") setTab("suggestions");
      if (path === "letter") setView("letter");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Manual content edits: autosaved, with undo/redo.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  function editResume(next: ResumeData, snapshot = true) {
    if (snapshot) {
      undo.current.push(s.resume);
      redo.current = [];
    }
    setDraft((d) => ({ ...d, state: { ...d.state, resume: next } }));
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => patch({ resume: next }), 700);
  }
  const doUndo = () => {
    const prev = undo.current.pop();
    if (!prev) return;
    redo.current.push(s.resume);
    editResume(prev, false);
  };
  const doRedo = () => {
    const next = redo.current.pop();
    if (!next) return;
    undo.current.push(s.resume);
    editResume(next, false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onBack) onBack();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const before = s.scores.before?.total ?? 0;
  const after = s.scores.after?.total ?? before;
  const delta = after - before;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 bg-gradient-to-r from-violet-700 via-indigo-600 to-cyan-600 px-3 py-2 text-white">
        {onBack ? (
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
            <ArrowLeft className="size-4" aria-hidden /> {backLabel}
          </button>
        ) : (
          <Link href="/studio" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/25"><ArrowLeft className="size-4" aria-hidden /> All applications</Link>
        )}
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold">{s.source.title}{s.source.company ? ` · ${s.source.company}` : ""}</p>
          <p className="truncate text-[11px] text-white/75">Based on “{s.baseName}” · your original résumé is never changed</p>
        </div>
        <button onClick={() => setTab("score")} className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm hover:bg-white/25" title="Estimated ATS Alignment — not an employer's ATS score">
          <span className="text-white/80">ATS est.</span>
          <b>{before}</b>
          {delta !== 0 && <><span aria-hidden>→</span><b>{after}</b><span className={cx("rounded-full px-1.5 text-xs font-bold", delta > 0 ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950")}>{delta > 0 ? `+${delta}` : delta}</span></>}
        </button>
        <button onClick={() => setTab("export")} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"><Download className="size-4" aria-hidden /> Download</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Tool rail */}
        <nav aria-label="Studio tools" className="order-last flex shrink-0 overflow-x-auto bg-zinc-900 md:order-none md:w-20 md:flex-col md:overflow-visible">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={cx("flex min-w-16 flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium md:flex-none", tab === id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-white")}>
              <Icon className={cx("size-5", tab === id && "text-violet-400")} aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        {/* Context panel */}
        <aside className="flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-r border-slate-200 bg-surface md:max-h-none md:w-[400px]" aria-label={TABS.find((t) => t.id === tab)?.label}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {error && <div className="mb-3"><Alert>{error}</Alert></div>}
            {s.warnings.length > 0 && tab !== "templates" && <div className="mb-3"><Alert kind="warning">{s.warnings.join(" ")}</Alert></div>}
            {tab === "job" && (
              <div className="text-xs">
                <h2 className="font-display text-lg font-bold">{s.source.title}</h2>
                <p className="font-medium text-slate-600">{s.source.company}{s.source.location ? ` · ${s.source.location}` : ""}</p>
                {s.analysis && s.analysis.responsibilities.length > 0 && (
                  <div className="mt-3 rounded-xl bg-violet-500/10 p-3 text-slate-600"><p className="font-semibold">Key responsibilities</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{s.analysis.responsibilities.slice(0, 6).map((r) => <li key={r}>{r}</li>)}</ul></div>
                )}
                <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{s.source.description}</p>
              </div>
            )}
            {tab === "templates" && <TemplateGallery compact resume={s.resume} personal={s.personal} selected={draft.templateId} canUsePro={canUsePro} onPick={(t) => patch({ templateId: t.id }).then(() => toast(`${t.name} applied${t.tier === "pro" && !canUsePro ? " — preview only on Free" : ""}.`))} />}
            {tab === "keywords" && <KeywordsPanel s={s} patch={patch} busy={busy} />}
            {tab === "suggestions" && <SuggestionsPanel s={s} patch={patch} busy={busy} onSuggest={() => action("suggest", {}, "Writing suggestions…")} />}
            {tab === "content" && <ContentPanel resume={s.resume} onChange={editResume} onRestore={() => patch({ restore: "base" }, "Restoring…")} history={s.history} onRestoreAt={(i) => patch({ restore: i }, "Restoring…")} />}
            {tab === "letter" && <LetterPanel s={s} busy={busy} onWrite={(tone, length) => action("letter", { tone, length }, "Writing your letter…")} onSave={(letter) => patch({ letter })} />}
            {tab === "score" && <ScorePanel before={s.scores.before} after={s.scores.after} />}
            {tab === "design" && <DesignPanel s={s} templateId={draft.templateId} patch={patch} />}
            {tab === "export" && <ExportPanel draft={draft} canUsePro={canUsePro} />}
          </div>
        </aside>

        {/* Canvas */}
        <main ref={canvasRef} className="relative min-h-0 flex-1 overflow-auto" aria-label="Document preview">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100/90 px-4 py-2 backdrop-blur">
            <div className="flex rounded-full bg-surface p-0.5 shadow-sm" role="tablist" aria-label="Document">
              {(["resume", "letter"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold", view === v ? "bg-violet-600 text-white" : "text-slate-600")}>
                  {v === "resume" ? <FileText className="size-3.5" aria-hidden /> : <Mail className="size-3.5" aria-hidden />} {v === "resume" ? "Résumé" : "Cover letter"}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button className="btn-ghost p-1.5" onClick={doUndo} disabled={!undo.current.length} aria-label="Undo"><Undo2 className="size-4" /></button>
              <button className="btn-ghost p-1.5" onClick={doRedo} disabled={!redo.current.length} aria-label="Redo"><Redo2 className="size-4" /></button>
              <span className="mx-1 h-4 w-px bg-slate-300" aria-hidden />
              <button className="btn-ghost p-1.5" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} aria-label="Zoom out"><Minus className="size-4" /></button>
              <span className="w-11 text-center text-xs tabular-nums text-slate-600">{Math.round(zoom * 100)}%</span>
              <button className="btn-ghost p-1.5" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))} aria-label="Zoom in"><Plus className="size-4" /></button>
            </div>
          </div>
          {/* w-max: wide pages scroll instead of being clipped on the left. */}
          <div className="flex w-max min-w-full flex-col items-center gap-3 p-4 sm:p-8">
            <div className="flex w-full max-w-[820px] flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs shadow-sm">
              <span className="flex items-center gap-2"><TierBadge tier={template.tier} /><ModeBadge mode={template.mode} /><b className="text-slate-800">{template.name}</b></span>
              <span className="text-slate-500">{view === "resume" ? "Résumé" : "Cover letter"} · {template.market} · {template.paper}</span>
              {template.tier === "pro" && !canUsePro && <Link href="/pricing" className="font-semibold text-amber-700 underline">Pro template — preview free, upgrade to download</Link>}
            </div>
            {busy && <p className="animate-pulse text-sm font-medium text-violet-700" aria-live="polite">{busy}</p>}
            <TemplateCanvas doc={doc} letter={s.letter} view={view} scale={zoom} className="rounded-sm shadow-2xl" />
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Keywords ------------------------------------------------------------------------

function KeywordsPanel({ s, patch, busy }: { s: StoredState; patch: (b: Record<string, unknown>, l?: string) => Promise<unknown>; busy: string | null }) {
  const groups = (Object.keys(GROUP_LABELS) as ReqGroup[]).map((g) => ({ g, items: s.matches.filter((m) => m.requirement.group === g) })).filter((x) => x.items.length);
  const set = (selected: string[], learning: string[]) => patch({ selected, learning }, "Updating score…");
  const toggle = (id: string, kind: "selected" | "learning") => {
    const sel = new Set(s.selected);
    const learn = new Set(s.learning);
    const [on, off] = kind === "selected" ? [sel, learn] : [learn, sel];
    if (on.has(id)) on.delete(id);
    else {
      on.add(id);
      off.delete(id);
    }
    return set([...sel], [...learn]);
  };
  const evidenced = s.matches.filter((m) => m.status !== "missing" && m.status !== "unclear").map((m) => m.requirement.id);
  const counts = (["exact", "equivalent", "partial", "missing"] as const).map((st) => [st, s.matches.filter((m) => m.status === st).length] as const);
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Keyword gap</h2>
        <p className="text-xs text-slate-500">Every requirement in the job, checked against your résumé with the exact evidence. Nothing is added unless you tick it and it&apos;s true.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{counts.map(([st, n]) => <span key={st} className={cx("chip text-[11px]", STATUS_STYLE[st])}>{STATUS_LABELS[st]}: {n}</span>)}</div>
        <div className="mt-2 flex gap-2">
          <button className="btn-secondary px-2.5 py-1 text-xs" disabled={!!busy} onClick={() => set([...new Set([...s.selected, ...evidenced])], s.learning.filter((x) => !evidenced.includes(x)))}>Select all evidenced</button>
          <button className="btn-ghost px-2.5 py-1 text-xs" disabled={!!busy} onClick={() => set([], [])}>Clear selection</button>
        </div>
      </div>
      {s.analysis?.method === "rules" && <p className="rounded-lg bg-zinc-500/10 p-2 text-[11px] text-slate-500">Analysed with the rule-based reader (AI unavailable or out of actions). It finds listed skills and processes reliably but may miss unusual wording.</p>}
      {groups.map(({ g, items }) => (
        <section key={g}>
          <h3 className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">{GROUP_LABELS[g]}</h3>
          <ul className="space-y-2">
            {items.map((m) => {
              const id = m.requirement.id;
              const missing = m.status === "missing";
              return (
                <li key={id} className="rounded-xl border border-slate-200 bg-surface p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{m.suggestion.wording}{m.requirement.essential && <span className="ml-1 text-rose-600" title="Required in the posting">*</span>}</p>
                    <span className={cx("chip shrink-0 text-[10px]", STATUS_STYLE[m.status])}>{STATUS_LABELS[m.status]}</span>
                  </div>
                  <p className="mt-1 text-slate-500">Job says: “{m.requirement.phrase.slice(0, 140)}”</p>
                  {m.evidence[0] ? (
                    <p className="mt-1 text-slate-700"><span className="font-medium">Your evidence</span> ({m.evidence[0].where}): “{m.evidence[0].text.slice(0, 160)}” <span className="text-slate-400">· {m.confidence} confidence</span></p>
                  ) : (
                    <p className="mt-1 font-medium text-rose-700">Not evidenced in your résumé.</p>
                  )}
                  <p className="mt-1 text-slate-500">{m.suggestion.why} Fits in: {m.suggestion.fits.join(", ")}.</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-violet-600" checked={s.selected.includes(id)} disabled={!!busy} onChange={() => toggle(id, "selected")} />{missing ? "I have this — add it" : "Include in skills"}</label>
                    {missing && <label className="flex items-center gap-1.5"><input type="checkbox" className="accent-violet-600" checked={s.learning.includes(id)} disabled={!!busy} onChange={() => toggle(id, "learning")} />Add as “Currently learning”</label>}
                  </div>
                  {missing && s.selected.includes(id) && <p className="mt-1.5 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-600">Only keep this if you genuinely have hands-on experience. Then click “Suggest changes” so it&apos;s worked into a relevant bullet.</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// --- Suggestions ----------------------------------------------------------------------

function SuggestionsPanel({ s, patch, busy, onSuggest }: { s: StoredState; patch: (b: Record<string, unknown>, l?: string) => Promise<unknown>; busy: string | null; onSuggest: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const label = (c: StoredState["changes"][number]) => (c.section === "experience" ? `${s.baseResume.experience[c.ref?.exp ?? 0]?.title ?? "Experience"} · bullet ${(c.ref?.bullet ?? 0) + 1}` : c.section === "headline" ? "Headline" : "Summary");
  const pendingN = s.changes.filter((c) => c.status === "pending").length;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold">Suggested changes</h2>
        <p className="text-xs text-slate-500">Each bullet rewritten for this job, with the reason. Accept, edit or reject each one — your original stays safe.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={!!busy} onClick={onSuggest}>{s.changes.length ? "Regenerate suggestions" : "✨ Suggest changes"}</button>
          {pendingN > 0 && <button className="btn-secondary px-3 py-1.5 text-xs" disabled={!!busy} onClick={() => patch({ acceptAll: true }, "Applying…")}><Check className="size-3.5" aria-hidden /> Accept all ({pendingN})</button>}
        </div>
      </div>
      {s.changes.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">No suggestions yet. Tick any keywords you have in the Keywords tab first, then ask for suggestions.</p>}
      <ul className="space-y-3">
        {s.changes.map((c) => (
          <li key={c.id} className={cx("rounded-xl border bg-surface p-3 text-xs", c.status === "accepted" ? "border-emerald-300" : c.status === "rejected" ? "border-slate-200 opacity-60" : "border-slate-200")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-800">{label(c)}</p>
              <span className={cx("chip text-[10px]", c.status === "accepted" ? "bg-emerald-500/15 text-emerald-500" : c.status === "rejected" ? "bg-zinc-500/15 text-zinc-500" : "bg-violet-500/15 text-violet-500")}>{c.status}</span>
            </div>
            <p className="mt-2 rounded-md bg-rose-500/10 p-2 text-rose-500 line-through decoration-rose-400">{c.original || "(empty)"}</p>
            {editing === c.id ? (
              <textarea className="input mt-2 min-h-24 text-xs" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit suggestion" />
            ) : (
              <p className="mt-2 rounded-md bg-emerald-500/10 p-2 text-emerald-500">{c.proposed}</p>
            )}
            <p className="mt-2 text-slate-500"><span className="font-medium text-slate-700">Why:</span> {c.reason}</p>
            {c.keywords.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{c.keywords.map((k) => <span key={k} className="chip bg-sky-500/10 text-[10px] text-sky-500">{k}</span>)}</div>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {editing === c.id ? (
                <>
                  <button className="btn-primary px-2.5 py-1 text-xs" onClick={() => patch({ changes: [{ id: c.id, proposed: text, status: "accepted" }] }, "Saving…").then(() => setEditing(null))}>Save & accept</button>
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setEditing(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn-secondary px-2.5 py-1 text-xs" disabled={!!busy || c.status === "accepted"} onClick={() => patch({ changes: [{ id: c.id, status: "accepted" }] }, "Applying…")}><Check className="size-3.5" aria-hidden /> Accept</button>
                  <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { setEditing(c.id); setText(c.proposed); }}><PenLine className="size-3.5" aria-hidden /> Edit</button>
                  <button className="btn-ghost px-2.5 py-1 text-xs" disabled={!!busy || c.status === "rejected"} onClick={() => patch({ changes: [{ id: c.id, status: "rejected" }] }, "Updating…")}><X className="size-3.5" aria-hidden /> {c.status === "accepted" ? "Undo" : "Reject"}</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {s.actionPlan.length > 0 && (
        <section>
          <h3 className="mb-2 font-display font-bold">What you should change</h3>
          <ol className="space-y-2">
            {s.actionPlan.map((a, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-surface p-3 text-xs">
                <p className="flex items-start gap-2 font-semibold text-slate-800"><span className={cx("chip shrink-0 text-[10px] capitalize", PRIORITY_STYLE[a.priority])}>{a.priority}</span>{a.title}</p>
                <p className="mt-1 text-slate-500">{a.why}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

// --- Content ---------------------------------------------------------------------------

function ContentPanel({ resume, onChange, onRestore, history, onRestoreAt }: { resume: ResumeData; onChange: (r: ResumeData) => void; onRestore: () => void; history: StoredState["history"]; onRestoreAt: (i: number) => void }) {
  const set = (p: Partial<ResumeData>) => onChange({ ...resume, ...p });
  const area = "input min-h-16 text-xs";
  return (
    <div className="space-y-4 text-xs">
      <div>
        <h2 className="font-display text-lg font-bold">Content</h2>
        <p className="text-slate-500">Edit this tailored version directly — changes save automatically. Titles, employers and dates come from your résumé; keep them accurate.</p>
      </div>
      <label className="block"><span className="label">Headline</span><input className="input text-xs" value={resume.headline} onChange={(e) => set({ headline: e.target.value })} /></label>
      <label className="block"><span className="label">Summary</span><textarea className={area} value={resume.summary} onChange={(e) => set({ summary: e.target.value })} /></label>
      {resume.experience.map((e, i) => (
        <fieldset key={i} className="rounded-xl border border-slate-200 p-3">
          <legend className="px-1 font-semibold">{e.title} · {e.company}</legend>
          {e.highlights.map((h, j) => (
            <textarea key={j} className={cx(area, "mt-1.5")} value={h} aria-label={`${e.title} bullet ${j + 1}`} onChange={(ev) => set({ experience: resume.experience.map((x, k) => (k === i ? { ...x, highlights: x.highlights.map((y, l) => (l === j ? ev.target.value : y)) } : x)) })} />
          ))}
        </fieldset>
      ))}
      {resume.skills.map((g, i) => (
        <label key={i} className="block"><span className="label">{g.category}</span><input className="input text-xs" value={g.skills.join(", ")} onChange={(e) => set({ skills: resume.skills.map((x, k) => (k === i ? { ...x, skills: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } : x)) })} /></label>
      ))}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="font-semibold">Revision history</p>
        <button className="btn-secondary mt-2 w-full text-xs" onClick={onRestore}>Restore my original résumé</button>
        <ul className="mt-2 space-y-1">{history.slice().reverse().slice(0, 8).map((h, k) => <li key={h.at + k} className="flex items-center justify-between"><span className="text-slate-500">{h.label} · {new Date(h.at).toLocaleTimeString()}</span><button className="btn-ghost px-2 py-0.5 text-[11px]" onClick={() => onRestoreAt(history.length - 1 - k)}>Restore</button></li>)}</ul>
      </div>
    </div>
  );
}

// --- Letter ----------------------------------------------------------------------------

function LetterPanel({ s, busy, onWrite, onSave }: { s: StoredState; busy: string | null; onWrite: (tone: string, length: string) => void; onSave: (l: StoredState["letter"]) => void }) {
  const [tone, setTone] = useState(s.letter?.tone ?? "confident");
  const [length, setLength] = useState(s.letter?.length ?? "concise");
  const [letter, setLetter] = useState(s.letter);
  useEffect(() => setLetter(s.letter), [s.letter]);
  return (
    <div className="space-y-3 text-xs">
      <div>
        <h2 className="font-display text-lg font-bold">Cover letter</h2>
        <p className="text-slate-500">Written for the same job from your verified experience — no invented achievements or company facts.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="label">Tone</span><select className="input text-xs" value={tone} onChange={(e) => setTone(e.target.value)}><option value="confident">Confident</option><option value="formal">Formal</option><option value="concise">Concise</option></select></label>
        <label><span className="label">Length</span><select className="input text-xs" value={length} onChange={(e) => setLength(e.target.value)}><option value="concise">Concise</option><option value="standard">Standard</option></select></label>
      </div>
      <button className="btn-primary w-full text-xs" disabled={!!busy} onClick={() => onWrite(tone, length)}>{s.letter ? "Rewrite letter" : "✨ Write my cover letter"}</button>
      {letter && (
        <div className="space-y-2">
          <input className="input text-xs" value={letter.subject} onChange={(e) => setLetter({ ...letter, subject: e.target.value })} aria-label="Subject" />
          <input className="input text-xs" value={letter.greeting} onChange={(e) => setLetter({ ...letter, greeting: e.target.value })} aria-label="Greeting" />
          {letter.paragraphs.map((p, i) => <textarea key={i} className="input min-h-24 text-xs" value={p} aria-label={`Paragraph ${i + 1}`} onChange={(e) => setLetter({ ...letter, paragraphs: letter.paragraphs.map((x, k) => (k === i ? e.target.value : x)) })} />)}
          <input className="input text-xs" value={letter.closing} onChange={(e) => setLetter({ ...letter, closing: e.target.value })} aria-label="Closing" />
          <button className="btn-secondary w-full text-xs" onClick={() => onSave(letter)}>Save letter edits</button>
        </div>
      )}
    </div>
  );
}

// --- Score -----------------------------------------------------------------------------

function ScorePanel({ before, after }: { before: AlignmentScore | null; after: AlignmentScore | null }) {
  if (!before || !after) return <p className="text-xs text-slate-500">Scores appear once the job is analysed.</p>;
  const delta = after.total - before.total;
  const gained = after.matched.filter((k) => !before.matched.includes(k));
  const lost = before.matched.filter((k) => !after.matched.includes(k));
  return (
    <div className="space-y-4 text-xs">
      <div>
        <h2 className="font-display text-lg font-bold">Estimated ATS Alignment</h2>
        <p className="text-slate-500">{SCORE_DISCLAIMER}</p>
      </div>
      <div className="grid grid-cols-3 items-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 p-4 text-center text-white">
        <div><p className="text-[11px] text-white/80">Before</p><p className="text-3xl font-bold">{before.total}</p></div>
        <div className={cx("rounded-full py-1 text-lg font-bold", delta > 0 ? "bg-emerald-400 text-emerald-950" : delta < 0 ? "bg-rose-400 text-rose-950" : "bg-white/20")}>{delta > 0 ? `+${delta}` : delta}</div>
        <div><p className="text-[11px] text-white/80">After your changes</p><p className="text-3xl font-bold">{after.total}</p></div>
      </div>
      <ul className="space-y-2.5">
        {after.categories.map((c) => {
          const b = before.categories.find((x) => x.key === c.key)!;
          const d = Math.round((c.points - b.points) * 10) / 10;
          return (
            <li key={c.key}>
              <div className="flex justify-between"><span className="font-medium">{c.label} <span className="text-slate-400">({c.weight}%)</span></span><span className="tabular-nums">{b.points} → <b>{c.points}</b>{d !== 0 && <span className={d > 0 ? "text-emerald-600" : "text-rose-600"}> ({d > 0 ? "+" : ""}{d})</span>}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${c.score}%` }} /></div>
              <p className="mt-0.5 text-[11px] text-slate-500">{c.detail}</p>
            </li>
          );
        })}
      </ul>
      {gained.length > 0 && <p className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500"><b>Newly covered:</b> {gained.join(", ")}</p>}
      {lost.length > 0 && <p className="rounded-lg bg-rose-500/10 p-2 text-rose-500"><b>No longer covered:</b> {lost.join(", ")} — an accepted edit removed this evidence. Restore or edit that line.</p>}
      {after.gaps.length > 0 && <p className="rounded-lg bg-zinc-500/10 p-2 text-slate-600"><b>Remaining gaps:</b> {after.gaps.join(", ")}. Address them only with real experience.</p>}
      {after.warnings.length > 0 && <ul className="list-disc space-y-1 pl-4 text-amber-600">{after.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
      <p className="text-[11px] text-slate-400">Method {after.method}: required 40 · preferred 15 · responsibilities 20 · evidence 15 · parsing 10. Skills-list-only keywords earn 60%, partial evidence 50%.</p>
    </div>
  );
}

// --- Design ----------------------------------------------------------------------------

const SECTION_NAMES: Record<SectionKey, string> = { summary: "Summary", skills: "Skills", experience: "Experience", projects: "Projects", education: "Education", certifications: "Certifications", personal: "Personal details", languages: "Languages" };

/** Crops to a centred square and downsizes in the browser, so only a small JPEG is ever uploaded. */
async function squareJpeg(file: File, size = 480): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
}

function PhotoPicker({ photo, patch }: { photo?: string; patch: (b: Record<string, unknown>, l?: string) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <span className="label">Photo</span>
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photo ? <img src={photo} alt="Your photo" className="size-full object-cover" /> : <span className="text-[10px]">No photo</span>}
        </div>
        <div className="space-y-1.5">
          <label className="btn-secondary cursor-pointer px-3 py-1 text-xs">
            {busy ? "Saving…" : photo ? "Replace photo" : "Add photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 15 * 1024 * 1024) return setErr("Choose an image under 15 MB.");
                setBusy(true);
                setErr("");
                try {
                  await patch({ photo: await squareJpeg(file) }, "Photo added");
                } catch {
                  setErr("That image couldn't be read. Try a JPEG or PNG.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          {photo && <button className="block text-xs text-rose-600 hover:underline" onClick={() => patch({ photo: null }, "Photo removed")}>Remove photo</button>}
        </div>
      </div>
      <p className="mt-2 text-slate-500">Optional. Stored only with this application, encrypted. Leave it out for ATS portals and markets that discourage photos (US, UK, Canada). Without a photo your initials are shown.</p>
      {err && <p className="mt-1 text-rose-600">{err}</p>}
    </div>
  );
}

function DesignPanel({ s, templateId, patch }: { s: StoredState; templateId: string; patch: (b: Record<string, unknown>, l?: string) => Promise<unknown> }) {
  const t = templateById(templateId);
  const design = s.design ?? {};
  const doc = buildDoc(s.resume, t, s.personal, { order: design.order, photo: s.photo });
  const order = doc.sections.map((x) => x.key);
  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    patch({ design: { order: next } });
  };
  const [personal, setPersonal] = useState(s.personal);
  return (
    <div className="space-y-4 text-xs">
      <h2 className="font-display text-lg font-bold">Design</h2>
      <div className="grid grid-cols-2 gap-2">
        <label><span className="label">Font</span><select className="input text-xs" value={design.font ?? t.style.font} onChange={(e) => patch({ design: { font: e.target.value } })}><option value="sans">Sans (Calibri / Helvetica)</option><option value="serif">Serif (Cambria / Times)</option></select></label>
        <label><span className="label">Spacing</span><select className="input text-xs" value={design.density ?? t.style.density} onChange={(e) => patch({ design: { density: e.target.value } })}><option value="airy">Airy</option><option value="standard">Standard</option><option value="compact">Compact</option></select></label>
      </div>
      <div>
        <span className="label">Accent colour</span>
        <div className="flex flex-wrap gap-2">{ACCENTS.map((c) => <button key={c} onClick={() => patch({ design: { accent: c } })} aria-label={`Accent ${c}`} className={cx("size-7 rounded-full ring-offset-2", (design.accent ?? t.style.accent) === c && "ring-2 ring-violet-500")} style={{ background: c }} />)}</div>
      </div>
      {showsPhoto(t) && <PhotoPicker photo={s.photo} patch={patch} />}
      {t.layout !== "form" && (
        <div>
          <span className="label">Section order</span>
          <ul className="space-y-1">{order.map((k, i) => <li key={k} className="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1"><span>{SECTION_NAMES[k]}</span><span><button className="btn-ghost p-1" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${SECTION_NAMES[k]} up`}><ChevronUp className="size-3.5" /></button><button className="btn-ghost p-1" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${SECTION_NAMES[k]} down`}><ChevronDown className="size-3.5" /></button></span></li>)}</ul>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="font-semibold">{t.market} conventions</p>
        <p className="mt-1 text-slate-500">{t.notes}</p>
        <p className="mt-1 text-slate-500">Paper {t.paper} · dates {t.dates} · photo {t.photo === "omit" ? "not used" : t.photo} · typical length {t.pages} pages.</p>
        {t.personal.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-slate-600">Optional details some employers here ask for. Leave blank unless the advert asks — none are required.</p>
            {t.personal.map((f) => <label key={f} className="block"><span className="label">{FIELD_LABELS[f]}</span><input className="input text-xs" value={personal[f] ?? ""} onChange={(e) => setPersonal({ ...personal, [f]: e.target.value })} /></label>)}
            <button className="btn-secondary w-full text-xs" onClick={() => patch({ personal })}>Save details</button>
          </div>
        ) : (
          <p className="mt-2 text-slate-500">This market expects no personal details beyond contact information.</p>
        )}
      </div>
    </div>
  );
}

// --- Export ----------------------------------------------------------------------------

type Check = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };

function ExportPanel({ draft, canUsePro }: { draft: DraftView; canUsePro: boolean }) {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const t = templateById(draft.templateId);
  const locked = t.tier === "pro" && !canUsePro;
  const url = (q: string) => `/api/studio/drafts/${draft.id}/export?${q}`;
  useEffect(() => {
    api<{ checks: Check[] }>(url("doc=resume&format=pdf&check=1")).then((r) => setChecks(r.checks)).catch(() => setChecks([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.state.resume, draft.templateId]);
  const link = (label: string, q: string, primary = false, disabled = false) =>
    disabled ? <span className="btn-secondary cursor-not-allowed text-xs opacity-50">{label}</span> : <a href={url(q)} className={cx(primary ? "btn-primary" : "btn-secondary", "text-xs")}>{label}</a>;
  const letter = !!draft.state.letter;
  return (
    <div className="space-y-4 text-xs">
      <h2 className="font-display text-lg font-bold">Download</h2>
      {locked && (
        <div className="rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-3 text-white">
          <p className="font-bold">“{t.name}” is a Pro template</p>
          <p className="mt-1 text-white/90">Preview it free. Upgrade to download it, or switch to a Free template.</p>
          <Link href="/pricing" className="mt-2 inline-block rounded-full bg-white px-3 py-1 font-semibold text-orange-600">See Pro</Link>
        </div>
      )}
      <div>
        <p className="label">Résumé — {t.name}</p>
        <div className="grid grid-cols-2 gap-2">{link("PDF", "doc=resume&format=pdf", true, locked)}{link("Word (DOCX)", "doc=resume&format=docx", true, locked)}</div>
      </div>
      <div>
        <p className="label">Plain ATS-first version (for job portals)</p>
        <div className="grid grid-cols-2 gap-2">{link("ATS PDF", "doc=resume&format=pdf&ats=1", false, locked)}{link("ATS Word", "doc=resume&format=docx&ats=1", false, locked)}</div>
      </div>
      <div>
        <p className="label">Cover letter</p>
        <div className="grid grid-cols-2 gap-2">{link("PDF", "doc=letter&format=pdf", false, locked || !letter)}{link("Word (DOCX)", "doc=letter&format=docx", false, locked || !letter)}</div>
        {!letter && <p className="mt-1 text-slate-500">Write your cover letter first.</p>}
      </div>
      <div>{link("📦 Application pack (résumé + letter, one PDF)", "doc=pack&format=pdf", false, locked || !letter)}</div>
      <p className="text-slate-500">Free plan: one tailored résumé and one cover letter download (re-downloading the same one is free). Text stays selectable in PDF and editable in Word.</p>
      <section>
        <h3 className="mb-2 font-semibold">Pre-download checklist</h3>
        {!checks ? <p className="text-slate-500">Checking…</p> : (
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span aria-hidden className={cx("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white", c.status === "pass" ? "bg-emerald-500" : c.status === "warn" ? "bg-amber-500" : "bg-rose-500")}>{c.status === "pass" ? "✓" : "!"}</span>
                <span><b>{c.label}</b>{c.status !== "pass" && <span className="text-slate-600"> — {c.detail}</span>}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">You can still download after warnings — they just make the risks clear.</p>
      </section>
    </div>
  );
}
