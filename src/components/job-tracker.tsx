"use client";

import { useState } from "react";
import { STATUS_LABELS } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";

export type TrackerState = {
  saved: boolean;
  status: string;
  notes: string;
  appliedAt: string; // yyyy-mm-dd or ""
  followUpAt: string;
  contactName: string;
  contactEmail: string;
  resumeVersionId: string | null;
};

/** Convert form state to the API payload (dates as ISO or null). */
export const trackerPayload = (p: Partial<TrackerState>) => ({
  ...p,
  ...(p.appliedAt !== undefined && { appliedAt: p.appliedAt ? new Date(p.appliedAt).toISOString() : null }),
  ...(p.followUpAt !== undefined && { followUpAt: p.followUpAt ? new Date(p.followUpAt).toISOString() : null }),
});

export function JobTracker({ jobId, initial, versions }: { jobId: string; initial: TrackerState; versions: { id: string | null; name: string }[] }) {
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [open, setOpen] = useState(initial.status !== "none");

  async function update(patch: Partial<TrackerState>) {
    const next = { ...s, ...patch };
    // Applying stamps today's date if none was entered.
    if (patch.status === "applied" && !s.appliedAt) next.appliedAt = new Date().toISOString().slice(0, 10);
    setS(next);
    try {
      await api(`/api/jobs/${encodeURIComponent(jobId)}/state`, { method: "POST", json: trackerPayload({ ...patch, ...(next.appliedAt !== s.appliedAt && { appliedAt: next.appliedAt }) }) });
      toast("Saved");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const blurSave = (k: keyof TrackerState) => () => s[k] !== initial[k] && update({ [k]: s[k] } as Partial<TrackerState>);

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold">Application tracker</h2>
        <button className="text-xs font-medium text-brand-600 hover:underline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Less" : "Details"}</button>
      </div>
      <div className="flex gap-2">
        <select className="input" value={s.status} onChange={(e) => update({ status: e.target.value })} aria-label="Status">
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn-secondary shrink-0" onClick={() => update({ saved: !s.saved })} aria-pressed={s.saved}>{s.saved ? "★ Saved" : "☆ Save"}</button>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-slate-600">Applied on<input type="date" className="input mt-1" value={s.appliedAt} onChange={(e) => setS({ ...s, appliedAt: e.target.value })} onBlur={blurSave("appliedAt")} /></label>
          <label className="text-xs text-slate-600">Follow up on<input type="date" className="input mt-1" value={s.followUpAt} onChange={(e) => setS({ ...s, followUpAt: e.target.value })} onBlur={blurSave("followUpAt")} /></label>
          <label className="text-xs text-slate-600">Contact name<input className="input mt-1" value={s.contactName} onChange={(e) => setS({ ...s, contactName: e.target.value })} onBlur={blurSave("contactName")} /></label>
          <label className="text-xs text-slate-600">Contact email<input type="email" className="input mt-1" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} onBlur={blurSave("contactEmail")} /></label>
          <label className="col-span-2 text-xs text-slate-600">Resume sent
            <select className="input mt-1" value={s.resumeVersionId ?? ""} onChange={(e) => update({ resumeVersionId: e.target.value || null })}>
              {versions.map((v) => <option key={v.id ?? "p"} value={v.id ?? ""}>{v.name}</option>)}
            </select>
          </label>
        </div>
      )}
      <textarea className="input min-h-20" aria-label="Notes" placeholder="Notes — recruiter name, next steps…" value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} onBlur={blurSave("notes")} />
      {s.followUpAt && <p className="text-xs text-slate-500">We&apos;ll email you a reminder on {new Date(s.followUpAt).toLocaleDateString()} (verified emails only).</p>}
    </div>
  );
}
