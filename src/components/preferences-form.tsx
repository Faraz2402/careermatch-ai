"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JobPreferences } from "@/lib/resume/schema";
import { cx } from "@/lib/format";
import { Alert, api } from "./client";

const SENIORITY = ["any", "intern", "junior", "mid", "senior", "lead", "executive"] as const;
const MODES = ["remote", "hybrid", "onsite"] as const;
const TYPES = ["full-time", "part-time", "contract", "internship", "temporary"] as const;

const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Toggle<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            className={cx("rounded-full border px-3 py-1 text-sm capitalize", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-surface text-slate-600 hover:border-slate-400")}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function PreferencesForm({ initial, onboarding }: { initial: JobPreferences; onboarding: boolean }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [roles, setRoles] = useState(initial.roles.join(", "));
  const [locations, setLocations] = useState(initial.locations.join(", "));
  const [industries, setIndustries] = useState(initial.industries.join(", "));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/preferences", { method: "PUT", json: { ...p, roles: toList(roles), locations: toList(locations), industries: toList(industries) } });
      if (onboarding) {
        router.push("/jobs");
        router.refresh();
      } else {
        setMsg({ kind: "success", text: "Preferences saved. Your matches will update." });
      }
    } catch (err) {
      setMsg({ kind: "error", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v.replace(/[^\d]/g, "")))));

  return (
    <form onSubmit={save} className="card space-y-6 p-6">
      <div>
        <label className="label" htmlFor="roles">Desired roles</label>
        <input id="roles" className="input" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Frontend Engineer, Full-Stack Engineer" />
        <p className="mt-1 text-xs text-slate-500">Comma-separated. Used for search keywords and title matching.</p>
      </div>
      <div>
        <span className="label">Seniority</span>
        <select className="input max-w-xs capitalize" value={p.seniority} onChange={(e) => setP({ ...p, seniority: e.target.value as JobPreferences["seniority"] })}>
          {SENIORITY.map((s) => <option key={s} value={s}>{s === "any" ? "Match my experience" : s}</option>)}
        </select>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="loc">Preferred locations</label>
          <input id="loc" className="input" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Austin, TX, New York" />
        </div>
        <div>
          <span className="label">Work arrangement</span>
          <Toggle options={MODES} value={p.workModes} onChange={(workModes) => setP({ ...p, workModes })} />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <span className="label">Salary range (yearly, USD)</span>
          <div className="flex items-center gap-2">
            <input className="input" inputMode="numeric" placeholder="Min" value={p.salaryMin ?? ""} onChange={(e) => setP({ ...p, salaryMin: num(e.target.value) })} />
            <span className="text-slate-400">–</span>
            <input className="input" inputMode="numeric" placeholder="Max" value={p.salaryMax ?? ""} onChange={(e) => setP({ ...p, salaryMax: num(e.target.value) })} />
          </div>
        </div>
        <div>
          <span className="label">Employment type</span>
          <Toggle options={TYPES} value={p.employmentTypes} onChange={(employmentTypes) => setP({ ...p, employmentTypes })} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ind">Industries</label>
        <input id="ind" className="input" value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="Healthcare, Fintech, Climate" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="auth">Work authorization</label>
          <input id="auth" className="input" value={p.workAuthorization} onChange={(e) => setP({ ...p, workAuthorization: e.target.value })} placeholder="e.g. US citizen, H-1B, EU work permit" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" className="size-4 accent-brand-600" checked={p.needsSponsorship} onChange={(e) => setP({ ...p, needsSponsorship: e.target.checked })} />
          I will need visa sponsorship
        </label>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : onboarding ? "Save & see my matches" : "Save preferences"}</button>
      </div>
    </form>
  );
}
