"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EXPERIENCE_LEVELS } from "@/lib/jobs/rank";
import type { JobCard as Job } from "@/lib/jobs/service";
import type { SourceStatus } from "@/lib/jobs/types";
import { cx } from "@/lib/format";
import { Alert, api } from "./client";
import { JobCard, JobCardSkeleton } from "./job-card";
import { FilterMenu } from "./filter-menu";
import { JobPreview } from "./job-preview";
import { LocationPicker } from "./location-picker";
import { describeFilters } from "./saved-searches";
import { useToast } from "./toast";
import { EmptyState } from "./ui";

type Result = { total: number; page: number; totalPages: number; jobs: Job[]; sources: SourceStatus[]; companies: string[] };

type Filters = {
  q: string;
  skills: string;
  company: string;
  country: string;
  city: string;
  includeRemote: boolean;
  workMode: string[];
  salaryMin: string;
  posted: string;
  seniority: string[];
  levels: string[];
  jobType: string[];
  sources: string[];
  onlySalary: boolean;
  view: string;
  sort: string;
};

const EMPTY: Filters = { q: "", skills: "", company: "", country: "", city: "", includeRemote: true, workMode: [], salaryMin: "", posted: "", seniority: [], levels: [], jobType: [], sources: [], onlySalary: false, view: "all", sort: "match" };

const DATE_OPTIONS = [
  { id: "", label: "Past month" },
  { id: "7", label: "Past week" },
  { id: "3", label: "Past 3 days" },
  { id: "1", label: "Past 24 hours" },
];

const VIEWS = [
  { id: "all", label: "All matches" },
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Tracked" },
  { id: "hidden", label: "Hidden" },
];

function toQuery(f: Filters, page: number, refresh = false) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (k === "includeRemote") {
      if (!v && f.country) p.set(k, "0"); // default is on
      continue;
    }
    if (Array.isArray(v) ? v.length : typeof v === "boolean" ? v : v !== "" && v !== EMPTY[k as keyof Filters]) p.set(k, Array.isArray(v) ? v.join(",") : typeof v === "boolean" ? "1" : v);
  }
  if (page > 1) p.set("page", String(page));
  if (refresh) p.set("refresh", "1");
  return p.toString();
}

function Chips({ options, value, onChange }: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={cx("rounded-full border px-2.5 py-0.5 text-xs", on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 bg-surface text-slate-600 hover:border-slate-300")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function JobDiscovery({ sources, defaultCountry }: { sources: { id: string; name: string }[]; defaultCountry: string }) {
  const initial = { ...EMPTY, country: defaultCountry };
  const [draft, setDraft] = useState<Filters>(initial);
  const [filters, setFilters] = useState<Filters>(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState<Set<string>>(new Set());
  const reqId = useRef(0);

  // Cards whose skills were only keyword-spotted get the AI read of their
  // requirements in one batch call, then their matches are patched in place.
  const readSkills = useCallback(async (jobs: Job[], id: number) => {
    const ids = jobs.filter((j) => j.match.skillsFrom === "keywords" && j.source !== "demo").map((j) => j.id).slice(0, 25);
    if (!ids.length) return;
    setReading(new Set(ids));
    try {
      const r = await api<{ jobs: { id: string; match: Job["match"] }[] }>("/api/jobs/requirements", { method: "POST", json: { ids } });
      const byId = new Map(r.jobs.map((j) => [j.id, j.match]));
      if (id === reqId.current) setData((d) => (d ? { ...d, jobs: d.jobs.map((j) => (byId.has(j.id) ? { ...j, match: byId.get(j.id)! } : j)) } : d));
    } catch {
      /* cards keep their keyword-based skills */
    } finally {
      if (id === reqId.current) setReading(new Set());
    }
  }, []);

  // Result count for a pending filter-menu selection (no source fetches).
  const countFor = useCallback(
    async (patch: Partial<Filters>) => (await api<Result>(`/api/jobs/search?${toQuery({ ...filters, ...patch }, 1)}&countOnly=1`)).total,
    [filters],
  );

  const load = useCallback(async (f: Filters, p: number, refresh = false) => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      const r = await api<Result>(`/api/jobs/search?${toQuery(f, p, refresh)}`);
      if (id === reqId.current) {
        setData(r);
        void readSkills(r.jobs, id);
      }
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [readSkills]);

  useEffect(() => {
    load(filters, page);
  }, [filters, page, load]);

  // Filters that are toggles apply immediately; text inputs apply on submit.
  const apply = (patch: Partial<Filters>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setFilters(next);
    setPage(1);
  };

  const patchJob = (id: string, patch: Partial<Job>) =>
    setData((d) => {
      if (!d) return d;
      const leaves = (patch.hidden !== undefined && (filters.view === "hidden" ? !patch.hidden : patch.hidden)) || (filters.view === "saved" && patch.saved === false);
      return { ...d, jobs: leaves ? d.jobs.filter((j) => j.id !== id) : d.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) };
    });

  const activeCount = [filters.workMode, filters.seniority, filters.jobType, filters.sources].reduce((a, v) => a + v.length, 0) + (filters.salaryMin ? 1 : 0) + (filters.onlySalary ? 1 : 0) + (filters.company ? 1 : 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl font-normal sm:text-5xl">Discover jobs</h1>
          <p className="text-sm text-slate-600">Ranked against your profile and preferences. Every listing shows where it came from.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setSaveOpen(true)}>🔔 Save search</button>
          <button className="btn-secondary" onClick={() => setImportOpen(true)}>+ Add a job link</button>
          <button className="btn-ghost" disabled={loading} onClick={() => load(filters, page, true)} title="Re-fetch sources (respects provider rate limits)">↻ Refresh</button>
        </div>
      </div>

      <form
        className="card grid items-start gap-3 p-4 md:grid-cols-[1.2fr_1fr_1.6fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <input className="input" placeholder="Job title (e.g. Procurement Analyst)" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} aria-label="Job title" />
        <input className="input" placeholder="Skills (comma-separated)" value={draft.skills} onChange={(e) => setDraft({ ...draft, skills: e.target.value })} aria-label="Skills" />
        <div className="md:col-span-1">
          <LocationPicker value={{ country: draft.country, city: draft.city, includeRemote: draft.includeRemote }} onChange={(loc) => apply(loc)} />
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
          Filters{activeCount ? ` (${activeCount})` : ""}
        </button>
        <button className="btn-primary">Search</button>

        <div className="flex flex-wrap items-center gap-2 md:col-span-5">
          <FilterMenu
            label="Date posted"
            mode="single"
            options={DATE_OPTIONS}
            value={[filters.posted]}
            defaultValue={[""]}
            onApply={([posted]) => apply({ posted })}
            countFor={([posted]) => countFor({ posted })}
          />
          <FilterMenu
            label="Experience level"
            mode="multi"
            options={[...EXPERIENCE_LEVELS]}
            value={filters.levels}
            defaultValue={[]}
            onApply={(levels) => apply({ levels })}
            countFor={(levels) => countFor({ levels })}
          />        </div>

        {showFilters && (
          <div className="grid gap-5 border-t border-slate-100 pt-4 md:col-span-5 md:grid-cols-3">
            <div>
              <p className="label">Work arrangement</p>
              <Chips options={[{ id: "remote", label: "Remote" }, { id: "hybrid", label: "Hybrid" }, { id: "onsite", label: "On-site" }]} value={draft.workMode} onChange={(workMode) => apply({ workMode })} />
            </div>
            <div>
              <p className="label">Job type</p>
              <Chips options={["full-time", "part-time", "contract", "intern"].map((s) => ({ id: s, label: s }))} value={draft.jobType} onChange={(jobType) => apply({ jobType })} />
            </div>
            <div>
              <label className="label" htmlFor="salary">Minimum salary (yearly)</label>
              <input id="salary" className="input" inputMode="numeric" placeholder="e.g. 120000" value={draft.salaryMin} onChange={(e) => setDraft({ ...draft, salaryMin: e.target.value.replace(/\D/g, "") })} onBlur={() => apply({})} />
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" className="accent-brand-600" checked={draft.onlySalary} onChange={(e) => apply({ onlySalary: e.target.checked })} />
                Only show listings with salary
              </label>
            </div>
            <div>
              <label className="label" htmlFor="company">Company</label>
              <input id="company" className="input" list="companies" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} onBlur={() => apply({})} />
              <datalist id="companies">{data?.companies.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="md:col-span-3">
              <p className="label">Source</p>
              <Chips options={sources.map((s) => ({ id: s.id, label: s.name }))} value={draft.sources} onChange={(s) => apply({ sources: s })} />
            </div>
            <div className="md:col-span-3 text-right">
              <button type="button" className="btn-ghost text-xs" onClick={() => { setDraft(initial); setFilters(initial); setPage(1); }}>Clear all filters</button>
            </div>
          </div>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => apply({ view: v.id })} className={cx("rounded-md px-3 py-1 text-sm font-medium", filters.view === v.id ? "bg-surface shadow-sm" : "text-slate-600")}>{v.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {data && !loading && <span>{data.total} {data.total === 1 ? "job" : "jobs"}</span>}
          <select aria-label="Sort" className="rounded-md border border-slate-200 bg-surface px-2 py-1 text-sm" value={filters.sort} onChange={(e) => apply({ sort: e.target.value })}>
            <option value="match">Best match</option>
            <option value="date">Most recent</option>
          </select>
        </div>
      </div>


      <div className="mt-4 space-y-4">
        {error ? (
          <EmptyState title="Couldn't load jobs" body={error} action={<button className="btn-primary" onClick={() => load(filters, page)}>Try again</button>} />
        ) : loading && !data ? (
          Array.from({ length: 4 }, (_, i) => <JobCardSkeleton key={i} />)
        ) : data && data.jobs.length === 0 ? (
          <EmptyState
            title={filters.view === "all" ? "No matching jobs" : `No ${VIEWS.find((v) => v.id === filters.view)?.label.toLowerCase()} jobs`}
            body={filters.view === "all" ? "Try broadening your keywords or filters, enable more sources, or add a job link you found yourself." : "Jobs you save, track or hide will appear here."}
            action={filters.view === "all" ? <button className="btn-secondary" onClick={() => setImportOpen(true)}>Add a job link</button> : undefined}
          />
        ) : (
          <div className={cx("grid gap-4", preview ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "lg:grid-cols-2", loading && "opacity-60 transition")}>
            {preview ? (
              <>
                <div className="space-y-4">
                  {data?.jobs.map((j) => <JobCard key={j.id} job={j} selected={j.id === preview} reading={reading.has(j.id)} onPreview={setPreview} onChange={(p) => patchJob(j.id, p)} />)}
                </div>
                <JobPreview id={preview} onClose={() => setPreview(null)} />
              </>
            ) : (
              data?.jobs.map((j) => <JobCard key={j.id} job={j} reading={reading.has(j.id)} onPreview={setPreview} onChange={(p) => patchJob(j.id, p)} />)
            )}
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
          <button className="btn-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>← Previous</button>
          <span className="px-3 text-sm text-slate-600">Page {data.page} of {data.totalPages}</span>
          <button className="btn-secondary" disabled={page >= data.totalPages || loading} onClick={() => setPage(page + 1)}>Next →</button>
        </nav>
      )}

      {data && (
        <p className="mt-8 text-center text-xs text-slate-500">
          Sources this search: {data.sources.map((s) => `${s.name} (${s.count}${s.cached ? ", cached" : ""})`).join(" · ") || "none enabled"}. Listings older than 30 days or without a date are flagged as possibly stale.
        </p>
      )}

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {saveOpen && <SaveSearchDialog filters={filters} onClose={() => setSaveOpen(false)} />}
    </div>
  );
}

function SaveSearchDialog({ filters, onClose }: { filters: Filters; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(filters.q || "My job search");
  const [frequency, setFrequency] = useState("weekly");
  const [busy, setBusy] = useState(false);
  const payload = {
    ...(filters.q && { q: filters.q }),
    ...(filters.skills && { skills: filters.skills }),
    ...(filters.company && { company: filters.company }),
    ...(filters.country && { country: filters.country }),
    ...(filters.city && { city: filters.city }),
    ...(filters.country && !filters.includeRemote && { includeRemote: false }),
    ...(filters.workMode.length && { workMode: filters.workMode }),
    ...(filters.salaryMin && { salaryMin: Number(filters.salaryMin) }),
    ...(filters.posted && { postedWithinDays: Number(filters.posted) }),
    ...(filters.seniority.length && { seniority: filters.seniority }),
    ...(filters.levels.length && { levels: filters.levels }),
    ...(filters.jobType.length && { jobType: filters.jobType }),
    ...(filters.sources.length && { sources: filters.sources }),
    ...(filters.onlySalary && { onlySalary: true }),
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="save-title" onClick={onClose}>
      <form
        className="card w-full max-w-md space-y-4 p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/saved-searches", { method: "POST", json: { name, frequency, filters: payload } });
            toast(frequency === "off" ? "Search saved" : `Saved — you'll get ${frequency} alerts`);
            onClose();
          } catch (err) {
            toast((err as Error).message, "error");
            setBusy(false);
          }
        }}
      >
        <h2 id="save-title" className="font-display text-lg font-bold">Save this search</h2>
        <p className="text-xs text-slate-500">{describeFilters(payload)}</p>
        <label className="block"><span className="label">Name</span><input className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className="label">Email me new matches</span>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Never (just save it)</option>
          </select>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save search"}</button>
        </div>
      </form>
    </div>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"url" | "paste">("url");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const r = await api<{ id: string }>("/api/jobs/import", { method: "POST", json: body });
      router.push(`/jobs/${encodeURIComponent(r.id)}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="card w-full max-w-lg space-y-4 p-6" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Add a job you found</h2>
          <button type="button" className="btn-ghost px-2" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          {(["url", "paste"] as const).map((m) => (
            <button type="button" key={m} onClick={() => setMode(m)} className={cx("rounded-md px-3 py-1 text-sm font-medium", mode === m ? "bg-surface shadow-sm" : "text-slate-600")}>
              {m === "url" ? "Job link" : "Paste description"}
            </button>
          ))}
        </div>
        {mode === "url" ? (
          <div>
            <label className="label" htmlFor="url">Job posting URL</label>
            <input id="url" name="url" type="url" required className="input" placeholder="https://boards.greenhouse.io/company/jobs/123" />
            <p className="mt-1 text-xs text-slate-500">We read the employer&apos;s public structured job data (or the official Greenhouse/Lever API). Pages behind a login, or that robots.txt disallows, aren&apos;t fetched.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="title" required className="input" placeholder="Job title" aria-label="Job title" />
              <input name="company" required className="input" placeholder="Company" aria-label="Company" />
            </div>
            <input name="location" className="input" placeholder="Location (optional)" aria-label="Location" />
            <input name="url" className="input" placeholder="Link to posting (optional)" aria-label="Link" />
            <textarea name="description" required minLength={50} className="input min-h-40" placeholder="Paste the full job description" aria-label="Description" />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? "Importing…" : "Add job"}</button>
        </div>
      </form>
    </div>
  );
}
