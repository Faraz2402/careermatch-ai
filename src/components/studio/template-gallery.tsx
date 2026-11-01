"use client";

import { Crown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cx } from "@/lib/format";
import type { ResumeData } from "@/lib/resume/schema";
import { MARKETS, TEMPLATES, type TemplateDef } from "@/lib/templates/catalog";
import { buildDoc, SAMPLE_PERSONAL, SAMPLE_RESUME, type Personal } from "@/lib/templates/model";
import { TemplateCanvas } from "./template-canvas";

export function TierBadge({ tier, className }: { tier: TemplateDef["tier"]; className?: string }) {
  return tier === "free" ? (
    <span className={cx("inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow", className)}>Free</span>
  ) : (
    <span className={cx("inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase shadow", className)}>
      <Crown className="size-3" aria-hidden /> Pro
    </span>
  );
}

export function ModeBadge({ mode, className }: { mode: TemplateDef["mode"]; className?: string }) {
  return (
    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", mode === "ats" ? "bg-sky-500/15 text-sky-500" : "bg-fuchsia-500/15 text-fuchsia-500", className)}>
      {mode === "ats" ? "ATS-first" : "Visual"}
    </span>
  );
}

const LEVELS = ["Entry", "Mid", "Senior", "Executive", "Academic"] as const;

/** Searchable template library. Shows the user's own résumé when given, else a fictional sample. */
export function TemplateGallery({ resume, personal, selected, onPick, canUsePro, compact }: { resume?: ResumeData; personal?: Personal; selected?: string; onPick?: (t: TemplateDef) => void; canUsePro: boolean; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [market, setMarket] = useState("");
  const [mode, setMode] = useState<"" | "ats" | "visual">("");
  const [tier, setTier] = useState<"" | "free" | "pro">("");
  const [level, setLevel] = useState("");
  const list = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (!q || `${t.name} ${t.market} ${t.notes} ${t.industries.join(" ")}`.toLowerCase().includes(q.toLowerCase())) &&
          (!market || t.market === market) &&
          (!mode || t.mode === mode) &&
          (!tier || t.tier === tier) &&
          (!level || t.levels.includes(level as (typeof LEVELS)[number])),
      ).sort((a, b) => Number(b.tier === "free") - Number(a.tier === "free")),
    [q, market, mode, tier, level],
  );
  const data = resume && resume.name ? resume : SAMPLE_RESUME;
  const pdata = resume && resume.name ? personal ?? {} : SAMPLE_PERSONAL;
  const select = "input w-auto py-1.5 text-xs";

  return (
    <div>
      <div className={cx("flex flex-wrap gap-2", compact ? "mb-3" : "mb-5")}>
        <label className="relative min-w-0 flex-1 basis-40">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className="input py-1.5 pl-8 text-xs" placeholder="Search country, style, industry…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search templates" />
        </label>
        <select className={select} value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Country or market"><option value="">All countries</option>{MARKETS.map((m) => <option key={m}>{m}</option>)}</select>
        <select className={select} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} aria-label="Layout"><option value="">ATS-first & Visual</option><option value="ats">ATS-first</option><option value="visual">Visual</option></select>
        <select className={select} value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} aria-label="Plan"><option value="">Free & Pro</option><option value="free">Free</option><option value="pro">Pro</option></select>
        <select className={select} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Career level"><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
      </div>
      <p className="mb-3 text-xs text-slate-500">{list.length} templates · original CareerMatch designs following each market&apos;s conventions. The job advert and employer instructions always come first.</p>
      <div className={cx("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
        {list.map((t) => {
          const locked = t.tier === "pro" && !canUsePro;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick?.(t)}
              className={cx("group relative overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none", selected === t.id ? "border-brand-500 ring-2 ring-brand-500" : "border-slate-200")}
              aria-label={`${t.name}, ${t.tier === "free" ? "free" : "Pro"} template, ${t.mode === "ats" ? "ATS-first" : "Visual"}`}
            >
              <div className="relative bg-slate-100 p-2">
                <TemplateCanvas doc={buildDoc(data, t, pdata)} scale={compact ? 0.17 : 0.24} crop guides={false} className="mx-auto rounded shadow-md" />
                <div className="absolute top-2 left-2 flex gap-1"><TierBadge tier={t.tier} /><ModeBadge mode={t.mode} /></div>
                {locked && <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/70 px-2 py-1 text-center text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">Preview free · download with Pro</div>}
              </div>
              <div className="p-2.5" style={{ background: "#fff" }}>
                <p className="truncate text-xs font-semibold text-zinc-900">{t.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{t.market} · {t.paper} · {t.pages} pages</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
