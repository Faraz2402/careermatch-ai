"use client";

import { useEffect, useState } from "react";
import type { InterviewQ } from "@/lib/interview-qa/store";
import { api } from "./client";
import { useToast } from "./toast";

type Data = { pending: InterviewQ[]; sources: { source: string; count: number }[] };

/** Review user-reported interview questions and refresh the open collections. */
export function AdminInterviewQa() {
  const toast = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api<Data>("/api/admin/interview-qa").then(setData).catch((e) => toast((e as Error).message, "error"));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const act = async (id: string, action: "approve" | "reject") => {
    await api(`/api/admin/interview-qa/${encodeURIComponent(id)}`, { method: "POST", json: { action } });
    toast(action === "approve" ? "Published" : "Rejected", "success");
    load();
  };
  const refresh = async () => {
    setBusy(true);
    try {
      const r = await api<{ results: { source: string; count?: number; created?: number; error?: string }[] }>("/api/admin/interview-qa", { method: "POST" });
      toast(r.results.map((x) => (x.error ? `${x.source}: failed` : `${x.source}: ${x.count} (${x.created} new)`)).join(" · "), "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Interview Q&amp;A</h2>
          <p className="text-sm text-slate-500">{data ? data.sources.map((s) => `${s.source}: ${s.count}`).join(" · ") : "Loading…"}</p>
        </div>
        <button onClick={refresh} disabled={busy} className="btn-secondary">{busy ? "Refreshing…" : "Refresh collections now"}</button>
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-700">User reports awaiting review ({data?.pending.length ?? 0})</h3>
      {data?.pending.length === 0 && <p className="mt-1 text-sm text-slate-500">Nothing to review.</p>}
      <ul className="mt-2 space-y-2">
        {data?.pending.map((q) => (
          <li key={q.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <p className="font-semibold text-slate-900">{q.question}</p>
            <p className="mt-1 text-xs text-slate-500">{[q.company, q.department, q.roles[0], q.questionType, q.roundType, q.dateAsked?.slice(0, 7)].filter(Boolean).join(" · ")}</p>
            {q.answer && <p className="mt-1 text-xs text-slate-600">Answer: {q.answer.slice(0, 300)}</p>}
            <div className="mt-2 flex gap-2">
              <button onClick={() => act(q.id, "approve")} className="btn-primary !px-3 !py-1 text-xs">Approve</button>
              <button onClick={() => act(q.id, "reject")} className="btn-ghost !px-3 !py-1 text-xs text-rose-600">Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
