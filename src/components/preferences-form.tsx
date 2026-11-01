"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { convertCurrency, currencyForCountry, currencySymbol, formatYearly } from "@/lib/geo/currency";
import { COUNTRIES } from "@/lib/geo/data";
import { detectLocation } from "@/lib/geo/detect";
import { SENIORITY_LEVELS, type JobPreferences } from "@/lib/resume/schema";
import { Alert, api } from "./client";

const MODES = ["remote", "hybrid", "onsite"] as const;
const TYPES = ["full-time", "part-time", "contract", "internship", "temporary"] as const;

export const INDUSTRIES = [
  "Information Technology", "Software & SaaS", "Banking", "Financial Services", "Fintech", "Insurance", "Consulting", "Accounting & Audit",
  "Manufacturing", "Automotive", "Aerospace & Defence", "Energy & Utilities", "Oil & Gas", "Chemicals", "Pharmaceuticals", "Healthcare",
  "Biotechnology", "Medical Devices", "FMCG / Consumer Goods", "Retail", "E-commerce", "Logistics & Supply Chain", "Transportation",
  "Telecommunications", "Media & Entertainment", "Advertising & Marketing", "Education & EdTech", "Real Estate & Construction",
  "Hospitality & Travel", "Food & Beverage", "Agriculture", "Government & Public Sector", "Non-profit", "Legal", "Human Resources & Staffing",
  "Cybersecurity", "Data & AI", "Gaming", "Climate & Sustainability", "Semiconductors",
];

const LEVEL_LABELS: Record<(typeof SENIORITY_LEVELS)[number], string> = { intern: "Intern", junior: "Junior", mid: "Mid-level", senior: "Senior", lead: "Lead", executive: "Executive" };

const toList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function Toggle<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label?: (o: T) => string }) {
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
            className={cx("rounded-full border px-3 py-1 text-sm", !label && "capitalize", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-surface text-slate-600 hover:border-slate-400")}
          >
            {on && <span aria-hidden>✓ </span>}
            {label ? label(o) : o}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-500 bg-brand-50 py-0.5 pr-1 pl-3 text-sm text-brand-700">
      {text}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${text}`}><X className="size-3.5" /></button>
    </span>
  );
}

/** Every country plus its major cities ("Pune, India"), for location suggestions. */
const PLACES = ["Remote", ...COUNTRIES.flatMap((c) => [c.name, ...c.cities.map((city) => `${city}, ${c.name}`)])];

/** Pick several locations: type to search countries and cities, or add your own. */
function LocationInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const starts = PLACES.filter((p) => p.toLowerCase().startsWith(t));
    const rest = PLACES.filter((p) => !p.toLowerCase().startsWith(t) && p.toLowerCase().includes(t));
    return [...starts, ...rest].filter((p) => !value.includes(p)).slice(0, 8);
  }, [q, value]);
  const add = (place: string) => {
    const v = place.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setQ("");
    setActive(0);
    inputRef.current?.focus();
  };
  return (
    <div className="relative">
      <div className="input flex min-h-11 flex-wrap items-center gap-1.5 py-1.5" onClick={() => inputRef.current?.focus()}>
        {value.map((v) => <Chip key={v} text={v} onRemove={() => onChange(value.filter((x) => x !== v))} />)}
        <input
          ref={inputRef}
          id="loc"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls="loc-options"
          aria-autocomplete="list"
          className="min-w-32 flex-1 bg-transparent text-sm outline-none"
          value={q}
          placeholder={value.length ? "Add another…" : "Type a city or country, e.g. Bengaluru"}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" || e.key === ",") {
              if (!q.trim()) return;
              e.preventDefault();
              add(matches[active] ?? q);
            } else if (e.key === "Backspace" && !q && value.length) onChange(value.slice(0, -1));
          }}
        />
      </div>
      {open && matches.length > 0 && (
        <ul id="loc-options" role="listbox" className="card absolute z-20 mt-1 max-h-64 w-full overflow-auto p-1 shadow-lg">
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)} className={cx("w-full rounded-md px-3 py-1.5 text-left text-sm", i === active ? "bg-brand-50 text-brand-700" : "hover:bg-slate-100")}>{m}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Currencies of the chosen locations, in order (USD when none can be detected). */
function currenciesFor(locations: string[]) {
  const list = locations.flatMap((l) => detectLocation(l).countries.slice(0, 1)).map(currencyForCountry);
  return [...new Set(list.length ? list : ["USD"])];
}

export function PreferencesForm({ initial, onboarding }: { initial: JobPreferences; onboarding: boolean }) {
  const router = useRouter();
  const [p, setP] = useState<JobPreferences>({ ...initial, seniorities: initial.seniorities?.length ? initial.seniorities : initial.seniority && initial.seniority !== "any" ? [initial.seniority] : [], salaryCurrency: initial.salaryCurrency ?? "USD" });
  const [roles, setRoles] = useState(initial.roles.join(", "));
  const [customIndustry, setCustomIndustry] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const currencies = currenciesFor(p.locations);
  // Keep the salary in the first location's currency, converting amounts already entered.
  const setLocations = (locations: string[]) => {
    const next = currenciesFor(locations);
    const cur = next.includes(p.salaryCurrency) ? p.salaryCurrency : next[0];
    const conv = (v: number | null) => (v == null ? null : Math.round(convertCurrency(v, p.salaryCurrency, cur)));
    setP({ ...p, locations, salaryCurrency: cur, salaryMin: conv(p.salaryMin), salaryMax: conv(p.salaryMax) });
  };
  const setCurrency = (cur: string) => {
    const conv = (v: number | null) => (v == null ? null : Math.round(convertCurrency(v, p.salaryCurrency, cur)));
    setP({ ...p, salaryCurrency: cur, salaryMin: conv(p.salaryMin), salaryMax: conv(p.salaryMax) });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/preferences", { method: "PUT", json: { ...p, roles: toList(roles), seniority: p.seniorities.length === 1 ? p.seniorities[0] : "any" } });
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
  const sym = currencySymbol(p.salaryCurrency);
  const grouped = (v: number | null) => (v == null ? "" : v.toLocaleString(p.salaryCurrency === "INR" ? "en-IN" : "en-US"));
  const customIndustries = p.industries.filter((i) => !INDUSTRIES.includes(i));

  return (
    <form onSubmit={save} className="card space-y-6 p-6">
      <div>
        <label className="label" htmlFor="roles">Desired roles</label>
        <input id="roles" className="input" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Frontend Engineer, Full-Stack Engineer" />
        <p className="mt-1 text-xs text-slate-500">Comma-separated. Used for search keywords and title matching.</p>
      </div>

      <div>
        <span className="label">Seniority</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={p.seniorities.length === 0} onClick={() => setP({ ...p, seniorities: [] })} className={cx("rounded-full border px-3 py-1 text-sm", p.seniorities.length === 0 ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-surface text-slate-600 hover:border-slate-400")}>
            {p.seniorities.length === 0 && <span aria-hidden>✓ </span>}Match my experience
          </button>
          <Toggle options={SENIORITY_LEVELS} value={p.seniorities} onChange={(seniorities) => setP({ ...p, seniorities })} label={(o) => LEVEL_LABELS[o]} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Pick one or more levels. Jobs at any of them score as a fit.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="loc">Preferred locations</label>
          <LocationInput value={p.locations} onChange={setLocations} />
          <p className="mt-1 text-xs text-slate-500">Add as many as you like. Press Enter to add your own.</p>
        </div>
        <div>
          <span className="label">Work arrangement</span>
          <Toggle options={MODES} value={p.workModes} onChange={(workModes) => setP({ ...p, workModes })} />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <span className="label">Salary range (yearly, {p.salaryCurrency})</span>
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">{sym}</span>
              <input className="input pl-8" inputMode="numeric" placeholder="Min" aria-label={`Minimum yearly salary in ${p.salaryCurrency}`} value={grouped(p.salaryMin)} onChange={(e) => setP({ ...p, salaryMin: num(e.target.value) })} />
            </label>
            <span className="text-slate-400">–</span>
            <label className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">{sym}</span>
              <input className="input pl-8" inputMode="numeric" placeholder="Max" aria-label={`Maximum yearly salary in ${p.salaryCurrency}`} value={grouped(p.salaryMax)} onChange={(e) => setP({ ...p, salaryMax: num(e.target.value) })} />
            </label>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {p.salaryMin != null || p.salaryMax != null ? `${p.salaryMin != null ? formatYearly(p.salaryMin, p.salaryCurrency) : "…"} – ${p.salaryMax != null ? formatYearly(p.salaryMax, p.salaryCurrency) : "…"}. ` : ""}
            Currency follows your first preferred location.
          </p>
          {currencies.length > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600" role="group" aria-label="Salary currency">
              Your locations use different currencies:
              {currencies.map((c) => (
                <button key={c} type="button" aria-pressed={p.salaryCurrency === c} onClick={() => setCurrency(c)} className={cx("rounded-full border px-2 py-0.5", p.salaryCurrency === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300")}>{currencySymbol(c)} {c}</button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="label">Employment type</span>
          <Toggle options={TYPES} value={p.employmentTypes} onChange={(employmentTypes) => setP({ ...p, employmentTypes })} />
        </div>
      </div>

      <div>
        <span className="label">Industries</span>
        <Toggle options={[...INDUSTRIES, ...customIndustries]} value={p.industries} onChange={(industries) => setP({ ...p, industries })} label={(o) => o} />
        <div className="mt-2 flex max-w-sm gap-2">
          <input className="input py-1.5 text-sm" value={customIndustry} onChange={(e) => setCustomIndustry(e.target.value)} placeholder="Add another industry" aria-label="Add another industry"
            onKeyDown={(e) => {
              if (e.key === "Enter" && customIndustry.trim()) {
                e.preventDefault();
                if (!p.industries.includes(customIndustry.trim())) setP({ ...p, industries: [...p.industries, customIndustry.trim()] });
                setCustomIndustry("");
              }
            }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{p.industries.length ? `${p.industries.length} selected.` : "Leave empty for any industry."}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="auth">Work authorization</label>
          <input id="auth" className="input" value={p.workAuthorization} onChange={(e) => setP({ ...p, workAuthorization: e.target.value })} placeholder="e.g. Indian citizen, H-1B, EU work permit" />
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
