"use client";

import { useState } from "react";
import { closestOriginal, wordDiff } from "@/lib/diff";
import type { GenerationOutput } from "@/lib/generate";
import type { ResumeData } from "@/lib/resume/schema";
import { cx } from "@/lib/format";
import { Alert } from "./client";

type Ats = GenerationOutput["ats_resume"];
type Letter = GenerationOutput["cover_letter"];

function Diff({ from, to }: { from: string; to: string }) {
  return (
    <span>
      {wordDiff(from, to).map((p, i) =>
        p.type === "same" ? <span key={i}>{p.text}</span> : p.type === "add" ? <ins key={i} className="rounded bg-emerald-100 text-emerald-900 no-underline">{p.text}</ins> : <del key={i} className="rounded bg-rose-100 text-rose-800">{p.text}</del>,
      )}
    </span>
  );
}

type BulletState = { text: string; accepted: boolean; original: string | null };

export function ReviewEditor({ kind, original, generated, initial, onSave, onCancel }: {
  kind: "ats_resume" | "cover_letter";
  original: ResumeData;
  generated: unknown;
  initial: unknown;
  onSave: (finalContent: unknown) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async (v: unknown) => {
    setSaving(true);
    setError("");
    try {
      await onSave(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (kind === "cover_letter") return <LetterEditor initial={initial as Letter} saving={saving} error={error} onSave={save} onCancel={onCancel} />;

  return <AtsReview original={original} generated={generated as Ats} initial={initial as Ats} saving={saving} error={error} onSave={save} onCancel={onCancel} />;
}

function LetterEditor({ initial, saving, error, onSave, onCancel }: { initial: Letter; saving: boolean; error: string; onSave: (v: Letter) => void; onCancel: () => void }) {
  const [l, setL] = useState(initial);
  return (
    <div className="space-y-3">
      <label className="block"><span className="label">Subject</span><input className="input" value={l.subject} onChange={(e) => setL({ ...l, subject: e.target.value })} /></label>
      <label className="block"><span className="label">Letter</span><textarea className="input min-h-80 text-sm" value={l.body} onChange={(e) => setL({ ...l, body: e.target.value })} /></label>
      <p className="text-xs text-slate-500">{l.body.trim().split(/\s+/).length} words</p>
      {error && <Alert>{error}</Alert>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={() => onSave(l)}>{saving ? "Saving…" : "Save letter"}</button>
      </div>
    </div>
  );
}

function AtsReview({ original, generated, initial, saving, error, onSave, onCancel }: { original: ResumeData; generated: Ats; initial: Ats; saving: boolean; error: string; onSave: (v: Ats) => void; onCancel: () => void }) {
  const [useTailoredSummary, setUseTailoredSummary] = useState(initial.summary !== original.summary);
  const [summary, setSummary] = useState(initial.summary);
  const [headline, setHeadline] = useState(initial.headline);
  const [skills, setSkills] = useState(() => new Set(initial.skills));
  const [roles, setRoles] = useState(() =>
    generated.experience.map((e, i) => {
      const orig = original.experience.find((o) => o.company === e.company && o.title === e.title) ?? original.experience[i];
      const originals = orig?.highlights ?? [];
      const current = initial.experience[i]?.bullets ?? e.bullets;
      return { ...e, originals, bullets: e.bullets.map((b, j): BulletState => ({ text: current[j] ?? b, accepted: current.includes(b) || current[j] !== undefined, original: closestOriginal(b, originals) })) };
    }),
  );

  const setBullet = (ri: number, bi: number, patch: Partial<BulletState>) =>
    setRoles((rs) => rs.map((r, i) => (i !== ri ? r : { ...r, bullets: r.bullets.map((b, j) => (j === bi ? { ...b, ...patch } : b)) })));

  const changed = roles.reduce((a, r) => a + r.bullets.filter((b) => b.original !== b.text).length, 0);

  function build(): Ats {
    return {
      ...generated,
      headline,
      summary: useTailoredSummary ? summary : original.summary,
      skills: generated.skills.filter((s) => skills.has(s)),
      experience: roles.map((r) => ({
        title: r.title,
        company: r.company,
        dates: r.dates,
        // Rejected rewrites fall back to the original bullet (or are dropped).
        bullets: r.bullets.map((b) => (b.accepted ? b.text : b.original)).filter((x): x is string => !!x && !!x.trim()),
      })),
    };
  }

  return (
    <div className="space-y-5 text-sm">
      <Alert kind="info">
        {changed} rewritten bullets. <ins className="rounded bg-emerald-100 px-1 no-underline">Green</ins> is new wording, <del className="rounded bg-rose-100 px-1">red</del> was removed. Untick a change to keep your original.
      </Alert>

      <section>
        <p className="label">Headline</p>
        <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <p className="label">Summary</p>
          <label className="flex items-center gap-1 text-xs"><input type="checkbox" className="accent-brand-600" checked={useTailoredSummary} onChange={(e) => setUseTailoredSummary(e.target.checked)} /> Use tailored</label>
        </div>
        {useTailoredSummary ? (
          <>
            <p className="mb-2 rounded-lg bg-slate-50 p-2 text-xs leading-relaxed"><Diff from={original.summary} to={summary} /></p>
            <textarea className="input min-h-24" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </>
        ) : (
          <p className="rounded-lg bg-slate-50 p-2 text-xs">{original.summary}</p>
        )}
      </section>

      <section>
        <p className="label">Skills <span className="font-normal text-slate-500">(click to include / exclude)</span></p>
        <div className="flex flex-wrap gap-1.5">
          {generated.skills.map((s) => (
            <button key={s} type="button" aria-pressed={skills.has(s)} onClick={() => setSkills((x) => { const n = new Set(x); if (n.has(s)) n.delete(s); else n.add(s); return n; })}
              className={cx("chip", skills.has(s) ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-slate-100 text-slate-400 line-through")}>{s}</button>
          ))}
        </div>
      </section>

      {roles.map((r, ri) => (
        <section key={ri}>
          <p className="font-semibold">{r.title} — {r.company} <span className="font-normal text-slate-500">({r.dates})</span></p>
          <ul className="mt-2 space-y-3">
            {r.bullets.map((b, bi) => (
              <li key={bi} className={cx("rounded-lg border p-2", b.accepted ? "border-slate-200" : "border-dashed border-slate-200 opacity-70")}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 accent-brand-600" checked={b.accepted} onChange={(e) => setBullet(ri, bi, { accepted: e.target.checked })} aria-label="Accept this change" />
                  <span className="flex-1 text-xs leading-relaxed">
                    {b.original ? (b.original === b.text ? <span className="text-slate-500">Unchanged: {b.text}</span> : <Diff from={b.original} to={b.text} />) : <span><span className="chip mr-1 bg-amber-50 text-amber-800">reordered / new phrasing</span>{b.text}</span>}
                  </span>
                </label>
                {b.accepted && <textarea className="input mt-2 min-h-12 text-xs" value={b.text} onChange={(e) => setBullet(ri, bi, { text: e.target.value })} aria-label="Edit bullet" />}
                {!b.accepted && <p className="mt-1 pl-6 text-[11px] text-slate-500">{b.original ? `Will keep: ${b.original}` : "Will be removed."}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {error && <Alert>{error}</Alert>}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white pt-3">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving} onClick={() => onSave(build())}>{saving ? "Saving…" : "Save reviewed version"}</button>
      </div>
    </div>
  );
}
