"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResumeData } from "@/lib/resume/schema";
import { relativeDate } from "@/lib/format";
import { api } from "./client";
import { cleanResume, ResumeEditor } from "./resume-editor";
import { useToast } from "./toast";
import { EmptyState } from "./ui";

type Version = { id: string; name: string; updatedAt: string; data: ResumeData };

export function ResumeVersions({ initial, limit, hasProfile }: { initial: Version[]; limit: number; hasProfile: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [versions, setVersions] = useState(initial);
  const [editing, setEditing] = useState<Version | null>(null);
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);

  if (!hasProfile)
    return <EmptyState title="Create your profile first" body="Resume versions start as a copy of your profile." action={<Link href="/onboarding" className="btn-primary">Upload resume</Link>} />;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/resumes", { method: "POST", json: { name, fromVersionId: from || undefined } });
      setName("");
      toast("Version created");
      const r = await api<{ versions: Version[] }>("/api/resumes");
      setVersions(r.versions);
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/api/resumes/${editing.id}`, { method: "PUT", json: { name: editing.name, data: cleanResume(editing.data) } });
      setVersions((vs) => vs.map((v) => (v.id === editing.id ? { ...editing, updatedAt: new Date().toISOString() } : v)));
      setEditing(null);
      toast("Version saved");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this resume version? Applications that used it will fall back to your primary profile.")) return;
    await api(`/api/resumes/${id}`, { method: "DELETE" });
    setVersions((vs) => vs.filter((v) => v.id !== id));
    toast("Version deleted", "info");
  }

  if (editing)
    return (
      <div className="w-full">
        <label className="mb-4 block"><span className="label">Version name</span><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
        <ResumeEditor value={editing.data} onChange={(data) => setEditing({ ...editing, data })} />
        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
          <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save version"}</button>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="card flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-48 flex-1"><span className="label">New version name</span><input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend focus" /></label>
        <label className="min-w-48"><span className="label">Copy from</span>
          <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Primary profile</option>
            {versions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </label>
        <button className="btn-primary" disabled={busy || versions.length >= limit}>Create version</button>
        <p className="w-full text-xs text-slate-500">{versions.length} of {limit} versions used on your plan.</p>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <p className="chip bg-brand-50 text-brand-700">Primary</p>
          <h3 className="mt-2 font-display font-bold">Primary profile</h3>
          <p className="text-xs text-slate-500">Powers your public page and default matching.</p>
          <Link href="/profile" className="btn-secondary mt-4 w-full text-xs">Edit profile</Link>
        </div>
        {versions.map((v) => (
          <div key={v.id} className="card p-5">
            <h3 className="font-display font-bold">{v.name}</h3>
            <p className="text-xs text-slate-500">{v.data.headline || "No headline"} · updated {relativeDate(v.updatedAt).toLowerCase()}</p>
            <p className="mt-2 text-xs text-slate-600">{v.data.experience.length} roles · {v.data.skills.flatMap((g) => g.skills).length} skills</p>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary flex-1 text-xs" onClick={() => setEditing(v)}>Edit</button>
              <button className="btn-ghost text-xs text-rose-600" onClick={() => remove(v.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
