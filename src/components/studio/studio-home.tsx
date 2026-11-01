"use client";

import { Copy, Crown, FileUp, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx, relativeDate } from "@/lib/format";
import type { ResumeData } from "@/lib/resume/schema";
import type { DraftSummary, DraftView } from "@/lib/tailor/drafts";
import { DEFAULT_TEMPLATE_ID, templateById } from "@/lib/templates/catalog";
import { Alert, api } from "../client";
import { useToast } from "../toast";
import { TemplateGallery, TierBadge } from "./template-gallery";

type SavedJob = { id: string; title: string; company: string };
type Base = { id: string | null; name: string };
type Upload = { id: string; fileName: string; size: number; extractedBy: string; createdAt: string };

export function StudioHome({ drafts: initial, jobs, bases, uploads: initialUploads, resume, canUsePro, draftLimit }: { drafts: DraftSummary[]; jobs: SavedJob[]; bases: Base[]; uploads: Upload[]; resume: ResumeData | null; canUsePro: boolean; draftLimit: number | null }) {
  const router = useRouter();
  const toast = useToast();
  const [drafts, setDrafts] = useState(initial);
  const [uploads, setUploads] = useState(initialUploads);
  const [mode, setMode] = useState<"paste" | "saved">(jobs.length ? "saved" : "paste");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [baseId, setBaseId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const atLimit = draftLimit !== null && drafts.length >= draftLimit;

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api<DraftView>("/api/studio/drafts", { method: "POST", json: mode === "saved" ? { jobId, baseId, templateId } : { title, company, description, baseId, templateId } });
      router.push(`/studio/${d.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tailored application? Your original résumé isn't affected.")) return;
    await api(`/api/studio/drafts/${id}`, { method: "DELETE" });
    setDrafts((d) => d.filter((x) => x.id !== id));
    toast("Deleted.");
  }

  async function duplicate(id: string) {
    try {
      const d = await api<DraftView>(`/api/studio/drafts/${id}/duplicate`, { method: "POST" });
      router.push(`/studio/${d.id}`);
    } catch (err) {
      toast((err as Error).message);
    }
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-600 to-cyan-500 p-6 text-white shadow-xl sm:p-10">
        <div aria-hidden className="absolute -top-20 -right-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <p className="relative inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Sparkles className="size-3.5" aria-hidden /> Make Resume & Cover Letter</p>
        <h1 className="relative mt-4 max-w-2xl font-serif text-5xl leading-tight font-normal sm:text-6xl">What are we applying for today?</h1>
        <p className="relative mt-3 max-w-2xl text-white/85">Paste a job or pick a saved one. We find the keywords you&apos;re missing, rewrite every bullet for the role — truthfully — write the matching cover letter, and show how your estimated ATS alignment moves.</p>

        <form onSubmit={start} className="relative mt-6 rounded-2xl bg-white p-4 text-zinc-900 shadow-2xl sm:p-5">
          <div className="mb-3 flex gap-1 rounded-full bg-zinc-100 p-1 text-sm font-semibold" role="tablist">
            {jobs.length > 0 && <button type="button" role="tab" aria-selected={mode === "saved"} onClick={() => setMode("saved")} className={cx("flex-1 rounded-full px-3 py-1.5", mode === "saved" ? "bg-violet-600 text-white" : "text-zinc-600")}>A saved job</button>}
            <button type="button" role="tab" aria-selected={mode === "paste"} onClick={() => setMode("paste")} className={cx("flex-1 rounded-full px-3 py-1.5", mode === "paste" ? "bg-violet-600 text-white" : "text-zinc-600")}>Paste a job description</button>
          </div>
          {mode === "saved" ? (
            <select className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm" value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="Saved job">
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} · {j.company}</option>)}
            </select>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm" placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Job title" />
              <input className="rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
              <textarea className="min-h-36 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm sm:col-span-2" placeholder="Paste the full job description here…" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Job description" required />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-zinc-600">Base résumé
              <select className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5" value={baseId ?? ""} onChange={(e) => setBaseId(e.target.value || null)}>{bases.map((b) => <option key={b.id ?? "p"} value={b.id ?? ""}>{b.name}</option>)}</select>
            </label>
            <span className="flex items-center gap-1.5 text-zinc-600">Template: <b className="text-zinc-900">{templateById(templateId).name}</b> <TierBadge tier={templateById(templateId).tier} /></span>
            <button className="ml-auto rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 font-semibold text-white shadow-lg disabled:opacity-60" disabled={busy || atLimit || !resume}>{busy ? "Analysing the job…" : "✨ Start tailoring"}</button>
          </div>
          {!resume && <p className="mt-3 text-sm text-amber-700">First add your résumé: <Link href="/onboarding" className="font-semibold underline">upload it here</Link>.</p>}
          {atLimit && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-3 text-sm text-amber-900">
              <Crown className="size-4 text-amber-500" aria-hidden /> You&apos;ve made your free tailored résumé and cover letter. Pro tailors for every job, unlocks every premium template and unlimited downloads.
              <Link href="/pricing" className="ml-auto rounded-full bg-amber-500 px-3 py-1 font-semibold text-white">Go Pro</Link>
            </div>
          )}
          {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        </form>
      </section>

      {/* Drafts */}
      <section>
        <div className="mb-3 flex items-end justify-between"><h2 className="font-display text-xl font-bold">Your tailored applications</h2>{draftLimit !== null && <span className="text-xs text-slate-500">Free plan: {Math.min(drafts.length, draftLimit)} of {draftLimit} used</span>}</div>
        {drafts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Nothing yet — start with a job above. Your master résumé is never changed; every application is its own version.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((d) => (
              <li key={d.id} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <Link href={`/studio/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{d.title || d.name}</p>
                  <p className="truncate text-sm text-slate-500">{d.company}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-slate-500">ATS est.</span><b>{d.before ?? "–"}</b>
                    {d.after !== null && d.before !== null && d.after !== d.before && <><span aria-hidden>→</span><b>{d.after}</b><span className={cx("rounded-full px-1.5 text-xs font-bold", d.after > d.before ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500")}>{d.after > d.before ? "+" : ""}{d.after - d.before}</span></>}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><TierBadge tier={templateById(d.templateId).tier} /> {templateById(d.templateId).name} · {relativeDate(d.updatedAt).toLowerCase()}</p>
                </Link>
                <div className="mt-3 flex gap-1 border-t border-slate-100 pt-2">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => duplicate(d.id)}><Copy className="size-3.5" aria-hidden /> Duplicate</button>
                  <button className="btn-ghost ml-auto px-2 py-1 text-xs text-rose-600" onClick={() => remove(d.id)}><Trash2 className="size-3.5" aria-hidden /> Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Templates */}
      <section id="templates" className="scroll-mt-24">
        <h2 className="font-display text-xl font-bold">Templates for India and 40+ markets</h2>
        <p className="mb-4 text-sm text-slate-500">Previewed with {resume?.name ? "your own résumé" : "a sample résumé"}. Pick one to use for your next application. <span className="font-medium">Free</span> templates are yours to download; <span className="font-medium">Pro</span> templates preview free.</p>
        <TemplateGallery resume={resume ?? undefined} selected={templateId} canUsePro={canUsePro} onPick={(t) => { setTemplateId(t.id); window.scrollTo({ top: 0, behavior: "smooth" }); toast(`${t.name} selected for your next application.`); }} />
      </section>

      {/* Originals */}
      <section>
        <h2 className="font-display text-xl font-bold">Your original résumé files</h2>
        <p className="mb-3 text-sm text-slate-500">Kept exactly as uploaded and never overwritten. Delete them any time.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/onboarding" className="btn-secondary text-sm"><FileUp className="size-4" aria-hidden /> Upload a new résumé</Link>
        </div>
        {uploads.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {uploads.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{u.fileName}</span>
                <span className="text-xs text-slate-500">{Math.round(u.size / 1024)} KB · {relativeDate(u.createdAt).toLowerCase()}{u.extractedBy === "ocr" && " · scanned (read by AI)"}</span>
                <a className="btn-ghost px-2 py-1 text-xs" href={`/api/uploads/${u.id}`}>Download</a>
                <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={async () => { await api(`/api/uploads/${u.id}`, { method: "DELETE" }); setUploads((x) => x.filter((y) => y.id !== u.id)); }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
