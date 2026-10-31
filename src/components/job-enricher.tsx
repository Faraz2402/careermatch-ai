"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Runs enrichment for a job the first time it's opened, then refreshes the
 * page so the verified link, full description and analysis appear.
 */
export function JobEnricher({ jobId, pending }: { jobId: string; pending: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const tries = useRef(0);

  useEffect(() => {
    if (!pending || tries.current >= 15) return;
    let live = true;
    const t = setTimeout(async () => {
      tries.current++;
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/enrich`, { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Couldn't analyse this job.");
      } catch (e) {
        if (live) setError((e as Error).message);
        return;
      }
      if (live) router.refresh();
    }, tries.current === 0 ? 0 : 6000); // later tries wait for another tab's run
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [pending, jobId, router]);

  if (!pending) return null;
  return (
    <div role="status" className="card flex items-start gap-3 border-brand-200 bg-brand-50/60 p-4 text-sm">
      {error ? (
        <p className="text-rose-700">{error}</p>
      ) : (
        <>
          <span className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden />
          <p className="text-slate-700">
            <b>Analysing this job…</b> Finding the original posting on the employer&rsquo;s site, reading the full description and requirements, and
            looking up market salaries. This takes about 30 seconds the first time.
          </p>
        </>
      )}
    </div>
  );
}
