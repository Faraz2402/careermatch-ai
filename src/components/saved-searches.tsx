"use client";

import Link from "next/link";
import { useState } from "react";
import { relativeDate } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";
import { EmptyState } from "./ui";

type Saved = { id: string; name: string; frequency: string; lastAlertAt: string; filters: Record<string, unknown> };

export function describeFilters(f: Record<string, unknown>) {
  const parts: string[] = [];
  if (f.q) parts.push(`“${f.q}”`);
  if (f.skills) parts.push(`skills: ${f.skills}`);
  if (f.city) parts.push(`in ${f.city}`);
  else if (f.country) parts.push(f.country === "REMOTE" ? "remote anywhere" : `in ${f.country}`);
  else if (f.location) parts.push(`in ${f.location}`);
  if (Array.isArray(f.workMode) && f.workMode.length) parts.push(f.workMode.join("/"));
  if (Array.isArray(f.seniority) && f.seniority.length) parts.push(f.seniority.join("/"));
  if (f.salaryMin) parts.push(`$${Math.round(Number(f.salaryMin) / 1000)}k+`);
  if (f.company) parts.push(`at ${f.company}`);
  return parts.join(" · ") || "All matches for your profile";
}

export function SavedSearchList({ initial, limit }: { initial: Saved[]; limit: number }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);

  async function update(id: string, frequency: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, frequency } : x)));
    await api(`/api/saved-searches/${id}`, { method: "PUT", json: { frequency } });
    toast(frequency === "off" ? "Alerts paused" : `Alerts set to ${frequency}`);
  }
  async function send(id: string) {
    try {
      const r = await api<{ sent: boolean; count?: number; reason?: string; delivered: boolean }>(`/api/saved-searches/${id}/send`, { method: "POST" });
      toast(r.sent ? `Digest with ${r.count} jobs ${r.delivered ? "sent" : "saved to the dev outbox"}.` : r.reason ?? "Nothing to send.", r.sent ? "success" : "info");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }
  async function remove(id: string) {
    await api(`/api/saved-searches/${id}`, { method: "DELETE" });
    setItems((xs) => xs.filter((x) => x.id !== id));
    toast("Saved search deleted", "info");
  }

  if (items.length === 0)
    return <EmptyState title="No saved searches yet" body="On the Jobs page, set up a search and click “Save search” to get alerts." action={<Link href="/jobs" className="btn-primary">Go to jobs</Link>} />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{items.length} of {limit} saved searches on your plan. Alerts include new listings scoring 50+.</p>
      {items.map((s) => (
        <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{s.name}</p>
            <p className="truncate text-xs text-slate-500">{describeFilters(s.filters)} · last alert {relativeDate(s.lastAlertAt).toLowerCase()}</p>
          </div>
          <select aria-label="Alert frequency" className="input w-auto py-1 text-sm" value={s.frequency} onChange={(e) => update(s.id, e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </select>
          <button className="btn-secondary px-3 py-1 text-xs" onClick={() => send(s.id)}>Send now</button>
          <button className="btn-ghost px-2 py-1 text-xs text-rose-600" onClick={() => remove(s.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
