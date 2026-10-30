"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SourceHealth } from "@/lib/jobs/registry";
import { cx, relativeDate } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";

export function AdminSources({ initial }: { initial: SourceHealth[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [boards, setBoards] = useState<Record<string, string>>(Object.fromEntries(initial.map((s) => [s.id, s.boards.join(", ")])));

  async function act(id: string, fn: () => Promise<string>) {
    setBusy(id);
    try {
      toast(await fn());
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 className="font-display text-lg font-bold">Job sources</h2>
        <p className="text-xs text-slate-500">Overrides here take precedence over JOB_SOURCES_ENABLED and the *_BOARDS env vars. API keys stay in env.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <tr><th className="px-4 py-2">Source</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Health (7d)</th><th className="px-4 py-2">Config</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initial.map((s) => {
              const live = s.enabled && s.configured;
              return (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-semibold">{s.name}</p><p className="text-xs text-slate-500">{s.kind.replace("_", " ")} · every {s.cacheMinutes >= 60 ? `${s.cacheMinutes / 60}h` : `${s.cacheMinutes || 60}m`} · {s.requestsPerMinute}/min</p></td>
                  <td className="px-4 py-3">
                    <span className={cx("chip", live ? (s.lastRun && !s.lastRun.ok ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700") : "bg-slate-100 text-slate-500")}>
                      {live ? (s.lastRun && !s.lastRun.ok ? "Degraded" : "Active") : s.enabled ? "Needs config" : "Disabled"}
                    </span>
                    {s.overridden && <p className="mt-1 text-[11px] text-slate-400">admin override</p>}
                    {s.reason && <p className="mt-1 max-w-48 text-[11px] text-amber-700">{s.reason}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p>{s.listings} live listings</p>
                    <p>{s.successRate != null ? `${s.successRate}% successful` : "no runs yet"}</p>
                    {s.lastRun && <p>last run {relativeDate(s.lastRun.at).toLowerCase()} · {s.lastRun.durationMs}ms{s.lastRun.ok ? ` · ${s.lastRun.count} jobs` : ""}</p>}
                    {s.lastRun && !s.lastRun.ok && <p className="text-rose-600">{s.lastRun.error}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {s.usesBoards ? (
                      <div className="flex gap-1">
                        <input className="input py-1 text-xs" aria-label={`${s.name} board tokens`} placeholder="stripe, figma" value={boards[s.id]} onChange={(e) => setBoards({ ...boards, [s.id]: e.target.value })} />
                        <button className="btn-secondary px-2 py-1 text-xs" disabled={busy === s.id} onClick={() => act(s.id, async () => { await api(`/api/admin/sources/${s.id}`, { method: "PUT", json: { boards: boards[s.id] } }); return "Boards saved"; })}>Save</button>
                      </div>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button className="btn-ghost px-2 py-1 text-xs" disabled={busy === s.id} onClick={() => act(s.id, async () => { await api(`/api/admin/sources/${s.id}`, { method: "PUT", json: { enabled: !s.enabled } }); return s.enabled ? "Source disabled" : "Source enabled"; })}>
                      {s.enabled ? "Disable" : "Enable"}
                    </button>
                    {s.overridden && <button className="btn-ghost px-2 py-1 text-xs" disabled={busy === s.id} onClick={() => act(s.id, async () => { await api(`/api/admin/sources/${s.id}`, { method: "PUT", json: { enabled: null } }); return "Override cleared"; })}>Reset</button>}
                    <button className="btn-secondary px-2 py-1 text-xs" disabled={!live || busy === s.id} onClick={() => act(s.id, async () => {
                      const r = await api<{ ok: boolean; count: number; error?: string }>(`/api/admin/sources/${s.id}/run`, { method: "POST" });
                      if (!r.ok) throw new Error(r.error ?? "Run failed");
                      return `Fetched ${r.count} listings`;
                    })}>{busy === s.id ? "Running…" : "Run now"}</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
