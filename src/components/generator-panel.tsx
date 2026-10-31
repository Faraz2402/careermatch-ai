"use client";

import Link from "next/link";
import { useState } from "react";
import type { GenerationOutput, Kind } from "@/lib/generate";
import type { ResumeData } from "@/lib/resume/schema";
import { cx, relativeDate } from "@/lib/format";
import { Alert, api, streamNdjson } from "./client";
import { ReviewEditor } from "./review-editor";
import { useToast } from "./toast";

export type Gen = { id: string; content: unknown; finalContent: unknown | null; engine: string; createdAt: string; warning?: string; resumeVersionId: string | null };
export type BaseResume = { id: string | null; name: string; data: ResumeData };

const ORDER: Kind[] = ["match_analysis", "missing_skills", "ats_resume", "cover_letter", "talking_points"];
const SHORT: Record<Kind, string> = { match_analysis: "Match", missing_skills: "Gaps", ats_resume: "ATS resume", cover_letter: "Cover letter", talking_points: "Talking points" };
const EXPORTABLE: Kind[] = ["ats_resume", "cover_letter"];

export function GeneratorPanel({ jobId, labels, initial, aiEnabled, bases }: { jobId: string; labels: Record<Kind, string>; initial: Partial<Record<Kind, Gen>>; aiEnabled: boolean; bases: BaseResume[] }) {
  const toast = useToast();
  const [kind, setKind] = useState<Kind>("match_analysis");
  const [gens, setGens] = useState(initial);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [error, setError] = useState("");
  const [streamText, setStreamText] = useState("");
  const [baseId, setBaseId] = useState<string | null>(initial.ats_resume?.resumeVersionId ?? null);
  const [reviewing, setReviewing] = useState(false);
  const [template, setTemplate] = useState("classic");
  const current = gens[kind];
  const base = bases.find((b) => b.id === baseId) ?? bases[0];

  async function run(k: Kind) {
    setBusy(k);
    setError("");
    setReviewing(false);
    try {
      if (k === "cover_letter") {
        setStreamText("");
        await streamNdjson("/api/generate/stream", { jobId, resumeVersionId: baseId }, (e) => {
          if (e.type === "text") setStreamText((t) => t + String(e.text));
          if (e.type === "reset") setStreamText("");
          if (e.type === "error") throw new Error(String(e.error));
          if (e.type === "done") setGens((g) => ({ ...g, cover_letter: { ...(e as unknown as Gen), finalContent: null } }));
        });
      } else {
        const r = await api<Gen>("/api/generate", { method: "POST", json: { jobId, kind: k, resumeVersionId: baseId } });
        setGens((g) => ({ ...g, [k]: r }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      setStreamText("");
    }
  }

  async function saveReview(finalContent: unknown) {
    if (!current) return;
    await api(`/api/generations/${current.id}`, { method: "PUT", json: { finalContent } });
    setGens((g) => ({ ...g, [kind]: { ...current, finalContent } }));
    setReviewing(false);
    toast("Reviewed version saved — exports will use it.");
  }

  const shown = current ? current.finalContent ?? current.content : null;
  const text = shown ? asText(kind, shown) : "";

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display font-bold">Application toolkit</h2>
          <Link href={`/jobs/${encodeURIComponent(jobId)}/interview`} className="btn-secondary px-2.5 py-1 text-xs">🎤 Mock interview</Link>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {aiEnabled ? "Generated with Claude from your resume only — it won't invent experience." : "AI isn't configured, so drafts are rule-based templates built from your resume."}
        </p>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          Base resume
          <select className="input py-1 text-xs" value={baseId ?? ""} onChange={(e) => setBaseId(e.target.value || null)}>
            {bases.map((b) => <option key={b.id ?? "primary"} value={b.id ?? ""}>{b.name}</option>)}
          </select>
        </label>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2" role="tablist">
        {ORDER.map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setReviewing(false); }} className={cx("shrink-0 rounded-md px-2.5 py-1 text-xs font-medium", kind === k ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50")}>
            {SHORT[k]}
            {gens[k] && <span className="ml-1 text-emerald-600" aria-label="generated">•</span>}
          </button>
        ))}
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{labels[kind]}</h3>
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy !== null} onClick={() => run(kind)}>
            {busy === kind ? "Generating…" : current ? "Regenerate" : "Generate"}
          </button>
        </div>
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}

        {busy === kind ? (
          streamText ? (
            <div className="max-h-[520px] overflow-y-auto rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-line" aria-live="polite">
              {streamText}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />
            </div>
          ) : (
            <div className="space-y-2" aria-live="polite">
              {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-3 animate-pulse rounded bg-slate-100" style={{ width: `${90 - i * 8}%` }} />)}
              <p className="pt-2 text-xs text-slate-500">{aiEnabled ? "Claude is tailoring this to the posting…" : "Building draft…"}</p>
            </div>
          )
        ) : current && reviewing ? (
          <ReviewEditor kind={kind as "ats_resume" | "cover_letter"} original={base.data} generated={current.content} initial={current.finalContent ?? current.content} onSave={saveReview} onCancel={() => setReviewing(false)} />
        ) : current ? (
          <div>
            {current.warning && <div className="mb-3"><Alert kind="warning">{current.warning}</Alert></div>}
            {current.finalContent != null && <p className="mb-2 text-xs font-medium text-emerald-700">✓ Showing your reviewed version</p>}
            <div className="max-h-[520px] overflow-y-auto rounded-lg bg-slate-50 p-4 text-sm"><Output kind={kind} content={shown} /></div>
            {EXPORTABLE.includes(kind) && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
                <button className="btn-secondary w-full text-xs" onClick={() => setReviewing(true)}>
                  {kind === "ats_resume" ? "Review changes & edit" : "Edit letter"}
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <select aria-label="Template" className="input w-auto py-1 text-xs" value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="classic">Classic template</option>
                    <option value="modern">Modern template</option>
                    <option value="compact">Compact template</option>
                  </select>
                  <a className="btn-primary px-3 py-1 text-xs" href={`/api/generations/${current.id}/export?format=pdf&template=${template}`}>⬇ PDF</a>
                  <a className="btn-primary px-3 py-1 text-xs" href={`/api/generations/${current.id}/export?format=docx&template=${template}`}>⬇ Word</a>
                </div>
                <p className="text-[11px] text-slate-500">Single-column, standard headings, real text — safe for applicant tracking systems.</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{current.engine === "template" ? "Template draft" : `By ${current.engine}`} · {relativeDate(current.createdAt).toLowerCase()}</span>
              <div className="flex gap-1">
                <button className="btn-ghost px-2 py-1 text-xs" onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard."))}>Copy</button>
                {!EXPORTABLE.includes(kind) && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => download(`${kind}.txt`, text)}>Download</button>}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Nothing generated yet for this job.</p>
        )}
      </div>
    </div>
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const List = ({ items, className }: { items: string[]; className?: string }) => (
  <ul className={cx("list-disc space-y-1 pl-5", className)}>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
);
const H = ({ children }: { children: React.ReactNode }) => <p className="mt-4 mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase first:mt-0">{children}</p>;

function Output({ kind, content }: { kind: Kind; content: unknown }) {
  switch (kind) {
    case "match_analysis": {
      const c = content as GenerationOutput["match_analysis"];
      return (
        <div>
          <p className="font-semibold">{c.fitScore}/100 — {c.verdict}</p>
          <H>Strengths</H><List items={c.strengths} />
          <H>Gaps</H><List items={c.gaps} />
          <H>Recommendation</H><p>{c.recommendation}</p>
        </div>
      );
    }
    case "missing_skills": {
      const c = content as GenerationOutput["missing_skills"];
      return (
        <div className="space-y-3">
          {c.missing.length === 0 && <p>No significant gaps found.</p>}
          {c.missing.map((m) => (
            <div key={m.skill}>
              <p className="font-semibold">{m.skill} <span className="chip ml-1 bg-surface text-slate-600 ring-1 ring-slate-200">{m.importance}</span></p>
              <p className="text-slate-600">{m.howToClose}</p>
            </div>
          ))}
          {c.transferable.length > 0 && (<><H>Transferable experience</H><List items={c.transferable} /></>)}
        </div>
      );
    }
    case "ats_resume": {
      const c = content as GenerationOutput["ats_resume"];
      return (
        <div>
          <p className="font-semibold">{c.headline}</p>
          <p className="mt-1">{c.summary}</p>
          <H>Skills</H><p>{c.skills.join(" · ")}</p>
          <H>Experience</H>
          {c.experience.map((e, i) => (
            <div key={i} className="mb-3">
              <p className="font-semibold">{e.title} — {e.company} <span className="font-normal text-slate-500">({e.dates})</span></p>
              <List items={e.bullets} />
            </div>
          ))}
          {c.education.length > 0 && (<><H>Education</H><List items={c.education} /></>)}
          {c.certifications.length > 0 && (<><H>Certifications</H><List items={c.certifications} /></>)}
          <H>Keywords covered</H><p className="text-emerald-700">{c.keywordsCovered.join(", ") || "—"}</p>
          {c.keywordsNotClaimed.length > 0 && (<><H>Left out (not on your profile)</H><p className="text-amber-700">{c.keywordsNotClaimed.join(", ")}</p></>)}
        </div>
      );
    }
    case "cover_letter": {
      const c = content as GenerationOutput["cover_letter"];
      return (<div><p className="mb-3 font-semibold">{c.subject}</p><p className="whitespace-pre-line">{c.body}</p></div>);
    }
    case "talking_points": {
      const c = content as GenerationOutput["talking_points"];
      return (
        <div>
          <H>Elevator pitch</H><p>{c.elevatorPitch}</p>
          <H>Suggested answers</H>
          {c.answers.map((a, i) => (<div key={i} className="mb-2"><p className="font-semibold">{a.question}</p><p className="text-slate-700">{a.answer}</p></div>))}
          <H>Stories to prepare</H><List items={c.storiesToPrepare} />
          <H>Questions to ask</H><List items={c.questionsToAsk} />
        </div>
      );
    }
  }
}

function asText(kind: Kind, content: unknown): string {
  const bullets = (xs: string[]) => xs.map((x) => `• ${x}`).join("\n");
  switch (kind) {
    case "match_analysis": {
      const c = content as GenerationOutput["match_analysis"];
      return `Fit: ${c.fitScore}/100 — ${c.verdict}\n\nStrengths\n${bullets(c.strengths)}\n\nGaps\n${bullets(c.gaps)}\n\n${c.recommendation}`;
    }
    case "missing_skills": {
      const c = content as GenerationOutput["missing_skills"];
      return c.missing.map((m) => `${m.skill} (${m.importance})\n${m.howToClose}`).join("\n\n");
    }
    case "ats_resume": {
      const c = content as GenerationOutput["ats_resume"];
      return [
        c.headline, "", "SUMMARY", c.summary, "", "SKILLS", c.skills.join(", "), "", "EXPERIENCE",
        ...c.experience.flatMap((e) => [`${e.title} | ${e.company} | ${e.dates}`, bullets(e.bullets), ""]),
        ...(c.education.length ? ["EDUCATION", ...c.education, ""] : []),
        ...(c.certifications.length ? ["CERTIFICATIONS", ...c.certifications] : []),
      ].join("\n");
    }
    case "cover_letter": {
      const c = content as GenerationOutput["cover_letter"];
      return `${c.subject}\n\n${c.body}`;
    }
    case "talking_points": {
      const c = content as GenerationOutput["talking_points"];
      return `ELEVATOR PITCH\n${c.elevatorPitch}\n\nANSWERS\n${c.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}\n\nSTORIES\n${bullets(c.storiesToPrepare)}\n\nQUESTIONS TO ASK\n${bullets(c.questionsToAsk)}`;
    }
  }
}
