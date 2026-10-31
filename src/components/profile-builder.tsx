"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResumeData, Visibility } from "@/lib/resume/schema";
import { Alert, api } from "./client";
import { ProfileView, THEME_STYLES, type ProfileTheme } from "./profile-view";
import { useToast } from "./toast";
import { cleanResume, ResumeEditor } from "./resume-editor";

type State = { data: ResumeData; visibility: Visibility; isPublic: boolean; slug: string; theme: ProfileTheme };

const VIS_LABELS: [keyof Visibility, string][] = [
  ["showLocation", "Location"],
  ["showEmail", "Email address"],
  ["showPhone", "Phone number"],
  ["showExperience", "Experience"],
  ["showSkills", "Skills"],
  ["showProjects", "Projects"],
  ["showCertifications", "Certifications"],
  ["showEducation", "Education"],
  ["showLinks", "Social links"],
];

export function ProfileBuilder({ initial, appUrl, views }: { initial: State; appUrl: string; views: number }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  async function save(patch?: Partial<State>) {
    const next = { ...s, ...patch };
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ slug: string }>("/api/profile", { method: "PUT", json: { ...next, data: cleanResume(next.data) } });
      setS({ ...next, slug: r.slug });
      toast("Profile saved");
      router.refresh();
    } catch (e) {
      setMsg({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const publicUrl = `${appUrl}/p/${s.slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-extrabold">Profile builder</h1>
            <p className="text-sm text-slate-600">Edit your details and choose what appears on your public page.</p>
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            {(["edit", "preview"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-surface shadow-sm" : "text-slate-600"}`}>{t}</button>
            ))}
          </div>
        </div>
        {tab === "edit" ? (
          <ResumeEditor value={s.data} onChange={(data) => setS({ ...s, data })} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <ProfileView data={cleanResume(s.data)} visibility={s.visibility} theme={s.theme} preview downloadHref="#" />
          </div>
        )}
      </div>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <div id="publish" className="card space-y-4 p-5">
          <h2 className="font-display font-bold">Publishing</h2>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{s.isPublic ? "Public — anyone with the link" : "Private — only you"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={s.isPublic}
              onClick={() => save({ isPublic: !s.isPublic })}
              disabled={busy}
              className={`relative h-6 w-11 rounded-full transition ${s.isPublic ? "bg-brand-600" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition ${s.isPublic ? "left-5.5" : "left-0.5"}`} />
            </button>
          </label>
          <div>
            <label className="label" htmlFor="slug">Profile URL</label>
            <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 text-sm focus-within:ring-2 focus-within:ring-brand-200">
              <span className="pl-3 text-slate-500">/p/</span>
              <input id="slug" className="w-full bg-transparent px-1 py-2 outline-none" value={s.slug} onChange={(e) => setS({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
            </div>
          </div>
          {s.isPublic && (
            <div className="flex gap-2">
              <Link href={`/p/${s.slug}`} target="_blank" className="btn-secondary flex-1 text-xs">Open page</Link>
              <button type="button" className="btn-secondary flex-1 text-xs" onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast("Link copied"))}>Copy link</button>
            </div>
          )}
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="font-display font-bold">Theme</h2>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Profile theme">
            {(Object.keys(THEME_STYLES) as ProfileTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={s.theme === t}
                onClick={() => setS({ ...s, theme: t })}
                className={`overflow-hidden rounded-lg border text-xs font-medium ${s.theme === t ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"}`}
              >
                <span className={`block h-8 ${THEME_STYLES[t].hero}`} />
                <span className="block py-1">{THEME_STYLES[t].label}</span>
              </button>
            ))}
          </div>
          {s.isPublic && <p className="text-xs text-slate-500">👁 {views} profile view{views === 1 ? "" : "s"} (excluding you)</p>}
        </div>

        <div className="card space-y-3 p-5">
          <h2 className="font-display font-bold">Visibility</h2>
          <p className="text-xs text-slate-500">Choose which sections appear on your public page.</p>
          {VIS_LABELS.map(([k, label]) => (
            <label key={k} className="flex items-center justify-between text-sm">
              {label}
              <input type="checkbox" className="size-4 accent-brand-600" checked={s.visibility[k]} onChange={(e) => setS({ ...s, visibility: { ...s.visibility, [k]: e.target.checked } })} />
            </label>
          ))}
        </div>

        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <button className="btn-primary w-full" onClick={() => save()} disabled={busy || !dirty}>
          {busy ? "Saving…" : dirty ? "Save changes" : "All changes saved"}
        </button>
      </aside>
    </div>
  );
}
