"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobCard } from "@/lib/jobs/service";
import { formatSalary, relativeDate } from "@/lib/format";
import { Alert, api } from "./client";
import { JobLinks } from "./apply-links";
import { ScoreRing, SourceBadge } from "./ui";

type Detail = { job: JobCard; description: string };

export function JobPreview({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api<Detail>(`/api/jobs/${encodeURIComponent(id)}`)
      .then((d) => live && setData(d))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="card hidden max-h-[calc(100vh-7rem)] overflow-y-auto lg:sticky lg:top-20 lg:block lg:self-start" aria-label="Job preview">
      <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface/95 px-5 py-3 backdrop-blur">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Preview</span>
        <div className="flex gap-1">
          <Link href={`/jobs/${encodeURIComponent(id)}`} className="btn-primary px-3 py-1 text-xs">Open & tailor →</Link>
          <button className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Close preview">✕</button>
        </div>
      </div>
      {error ? (
        <div className="p-5"><Alert>{error}</Alert></div>
      ) : !data ? (
        <div className="animate-pulse space-y-3 p-5">
          <div className="h-6 w-2/3 rounded bg-slate-200" />
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-3 rounded bg-slate-100" />)}
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">{data.job.title}</h2>
              <p className="font-medium text-slate-700">{data.job.company}</p>
              <p className="mt-1 text-sm text-slate-600">
                {data.job.location || "Location not stated"} · {formatSalary(data.job) ?? "Salary not listed"} · Posted {relativeDate(data.job.postedAt).toLowerCase()}
              </p>
            </div>
            <ScoreRing value={data.job.match.score} size={60} />
          </div>
          <SourceBadge kind={data.job.sourceKind} name={data.job.sourceName} stale={data.job.match.stale} />
          <div className="flex justify-end">
            <JobLinks job={data.job} />
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-emerald-700">Why it fits</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">{data.job.match.reasons.slice(0, 4).map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
            <div>
              <p className="font-semibold text-amber-700">Watch out for</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">{data.job.match.concerns.slice(0, 4).map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 text-sm leading-relaxed whitespace-pre-line text-slate-700">{data.description}</div>
        </div>
      )}
    </aside>
  );
}
