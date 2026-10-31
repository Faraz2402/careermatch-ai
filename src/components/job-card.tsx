"use client";

import Link from "next/link";
import { useState } from "react";
import type { JobCard as Job } from "@/lib/jobs/service";
import { formatSalary, relativeDate, STATUS_LABELS } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";
import { applyPlatform } from "@/lib/apply-links";
import { FindOnLinks } from "./apply-links";
import { ScoreExplainer, SourceBadge } from "./ui";

const MODE_ICON: Record<string, string> = { remote: "🌍 Remote", hybrid: "🏢 Hybrid", onsite: "📍 On-site", unknown: "Arrangement not stated" };

export function JobCard({ job, onChange, onPreview, selected }: { job: Job; onChange: (patch: Partial<Job>) => void; onPreview?: (id: string) => void; selected?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const salary = formatSalary(job);

  async function update(patch: { saved?: boolean; hidden?: boolean; status?: string }) {
    setBusy(true);
    const prev = { saved: job.saved, hidden: job.hidden, status: job.status };
    onChange(patch);
    try {
      await api(`/api/jobs/${encodeURIComponent(job.id)}/state`, { method: "POST", json: patch });
      if (patch.saved !== undefined) toast(patch.saved ? "Saved to your shortlist" : "Removed from saved", patch.saved ? "success" : "info");
      if (patch.hidden !== undefined) toast(patch.hidden ? "Hidden — we'll show fewer jobs like this" : "Job restored", "info");
    } catch (e) {
      onChange(prev);
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card flex flex-col gap-4 p-5 transition hover:shadow-md ${selected ? "ring-2 ring-brand-400" : ""}`}>
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${encodeURIComponent(job.id)}`}
            onClick={(e) => {
              // Desktop: open in the side panel instead of navigating.
              if (onPreview && window.matchMedia("(min-width: 1024px)").matches) {
                e.preventDefault();
                onPreview(job.id);
              }
            }}
            className="font-display text-lg leading-snug font-bold text-slate-900 hover:text-brand-700"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 text-sm font-medium text-slate-700">{job.company}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
            <span>{job.location || "Location not stated"}</span>
            <span>{MODE_ICON[job.workMode] ?? job.workMode}</span>
            {job.employmentType && <span className="capitalize">{job.employmentType}</span>}
            <span className={salary ? "font-semibold text-emerald-700" : "text-slate-400"}>{salary ?? "Salary not listed"}</span>
            <span title={job.postedAt ?? undefined}>Posted {relativeDate(job.postedAt).toLowerCase()}</span>
          </div>
        </div>
        <ScoreExplainer match={job.match} />
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Top matching qualifications</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {job.match.matched.length ? job.match.matched.slice(0, 6).map((s) => <span key={s} className="chip bg-emerald-50 text-emerald-700">✓ {s}</span>) : <span className="text-xs text-slate-500">No specific skill overlap detected</span>}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-700">Missing or weaker</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {job.match.missing.length ? job.match.missing.slice(0, 5).map((s) => <span key={s} className="chip bg-amber-50 text-amber-800">{s}</span>) : <span className="text-xs text-slate-500">No gaps detected</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FindOnLinks job={job} compact />
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
            Apply on {applyPlatform(job.url) ?? "source"} ↗
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <SourceBadge kind={job.sourceKind} name={job.sourceName} stale={job.match.stale} />
        <div className="flex items-center gap-1.5">
          <select
            aria-label="Application status"
            className="rounded-md border border-slate-200 bg-surface px-2 py-1 text-xs"
            value={job.status}
            disabled={busy}
            onChange={(e) => update({ status: e.target.value })}
          >
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => update({ saved: !job.saved })} aria-pressed={job.saved}>
            {job.saved ? "★ Saved" : "☆ Save"}
          </button>
          <button className="btn-ghost px-2 py-1 text-xs" disabled={busy} onClick={() => update({ hidden: !job.hidden })}>
            {job.hidden ? "Unhide" : "Hide"}
          </button>
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="btn-primary px-3 py-1 text-xs">Tailor</Link>
        </div>
      </div>
    </article>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="card animate-pulse space-y-3 p-5">
      <div className="h-5 w-2/3 rounded bg-slate-200" />
      <div className="h-4 w-1/3 rounded bg-slate-100" />
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-slate-100" />
        <div className="h-5 w-20 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
