"use client";

import {
  BarChart3,
  Briefcase,
  Code2,
  Cog,
  Crown,
  Eye,
  GraduationCap,
  HeartPulse,
  Hotel,
  Landmark,
  LayoutGrid,
  Lightbulb,
  Megaphone,
  Palette,
  Scale,
  School,
  Search,
  Truck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/format";
import type { ResumeData } from "@/lib/resume/schema";
import { MARKETS, ROLES, STYLES, styleTags, TEMPLATES, type Role, type StyleTag, type TemplateDef } from "@/lib/templates/catalog";
import { buildDoc, SAMPLE_PERSONAL, SAMPLE_RESUME, type DocModel, type Personal } from "@/lib/templates/model";
import { pageSize, TemplateCanvas } from "./template-canvas";

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
    <span className={cx("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow", mode === "ats" ? "bg-sky-600 text-white" : "bg-fuchsia-600 text-white", className)}>
      {mode === "ats" ? "ATS-first" : "Visual"}
    </span>
  );
}

const LEVELS = ["Entry", "Mid", "Senior", "Executive", "Academic"] as const;

const ROLE_ICON: Record<Role, LucideIcon> = {
  "Software & IT": Code2,
  "Data & Analytics": BarChart3,
  "Finance & Accounting": Wallet,
  "Banking & Insurance": Landmark,
  "Sales & Marketing": Megaphone,
  "Design & Creative": Palette,
  "Healthcare & Nursing": HeartPulse,
  "Engineering & Manufacturing": Cog,
  "HR & Recruitment": Users,
  "Operations & Supply Chain": Truck,
  "Consulting & Strategy": Lightbulb,
  "Teaching & Education": School,
  Legal: Scale,
  "Hospitality & Retail": Hotel,
  "Students & Freshers": GraduationCap,
  "Executive & Leadership": Briefcase,
};

/** Page-1 thumbnail that fills its card width; mounts the (heavy) document only once it nears the viewport. */
function Thumb({ doc }: { doc: DocModel }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [seen, setSeen] = useState(false);
  const page = pageSize(doc.template.paper);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: "600px 0px" });
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    io.observe(el);
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);
  return (
    <div ref={box} className="w-full overflow-hidden rounded-md bg-white shadow-[0_8px_24px_-12px_rgba(16,21,43,0.35)]" style={{ aspectRatio: `${page.w} / ${page.h}` }}>
      {seen && width > 0 && <TemplateCanvas doc={doc} scale={width / page.w} crop guides={false} />}
    </div>
  );
}

/** Full-size preview of every page, scaled to the window. */
function PreviewModal({ t, doc, locked, onClose, onPick }: { t: TemplateDef; doc: DocModel; locked: boolean; onClose: () => void; onPick?: () => void }) {
  const page = pageSize(t.paper);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const fit = () => setWidth(Math.min(window.innerWidth - 48, 900));
    fit();
    window.addEventListener("resize", fit);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0b1020]/85 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${t.name} preview`} onClick={onClose}>
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#10152b] px-5 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <TierBadge tier={t.tier} />
        <ModeBadge mode={t.mode} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{t.name}</p>
          <p className="truncate text-xs text-white/70">{t.market} · {t.paper} · {t.pages} pages{t.roles.length ? ` · ${t.roles.join(", ")}` : ""}</p>
        </div>
        {onPick && (
          <button className="btn-primary !px-5" onClick={() => { onPick(); onClose(); }}>
            {locked ? "Use template (Pro to download)" : "Use this template"}
          </button>
        )}
        <button className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" onClick={onClose} aria-label="Close preview"><X className="size-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-6" onClick={onClose}>
        <p className="mx-auto mb-4 max-w-3xl text-center text-sm text-white/80" onClick={(e) => e.stopPropagation()}>{t.notes}</p>
        <div className="mx-auto w-fit shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {width > 0 && <TemplateCanvas doc={doc} scale={width / page.w} />}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Searchable, Canva-style template library. Shows the user's own résumé when given, else a fictional sample. */
export function TemplateGallery({ resume, personal, selected, onPick, canUsePro, compact }: { resume?: ResumeData; personal?: Personal; selected?: string; onPick?: (t: TemplateDef) => void; canUsePro: boolean; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [style, setStyle] = useState<StyleTag | "">("");
  const [market, setMarket] = useState("");
  const [mode, setMode] = useState<"" | "ats" | "visual">("");
  const [tier, setTier] = useState<"" | "free" | "pro">("");
  const [level, setLevel] = useState("");
  const [preview, setPreview] = useState<TemplateDef | null>(null);
  const closePreview = useCallback(() => setPreview(null), []);
  const list = useMemo(
    () =>
      TEMPLATES.filter(
        (t) =>
          (!q || `${t.name} ${t.market} ${t.notes} ${t.industries.join(" ")} ${t.roles.join(" ")}`.toLowerCase().includes(q.toLowerCase())) &&
          (!role || t.roles.includes(role)) &&
          (!style || styleTags(t).includes(style)) &&
          (!market || t.market === market) &&
          (!mode || t.mode === mode) &&
          (!tier || t.tier === tier) &&
          (!level || t.levels.includes(level as (typeof LEVELS)[number])),
      ).sort((a, b) => Number(b.tier === "free") - Number(a.tier === "free")),
    [q, role, style, market, mode, tier, level],
  );
  const data = resume && resume.name ? resume : SAMPLE_RESUME;
  const pdata = resume && resume.name ? personal ?? {} : SAMPLE_PERSONAL;
  const docFor = (t: TemplateDef) => buildDoc(data, t, pdata);
  const select = "input w-auto py-1.5 text-xs";
  const counts = { free: list.filter((t) => t.tier === "free").length, pro: list.filter((t) => t.tier === "pro").length };

  return (
    <div>
      {/* Role categories */}
      <div className={cx("-mx-1 flex gap-2 overflow-x-auto px-1 pb-2", compact ? "mb-2" : "mb-4")} role="tablist" aria-label="Job role">
        {[["", "All roles", LayoutGrid] as const, ...ROLES.map((r) => [r, r, ROLE_ICON[r]] as const)].map(([value, label, Icon]) => {
          const on = role === value;
          return (
            <button
              key={label}
              role="tab"
              aria-selected={on}
              onClick={() => setRole(value as Role | "")}
              className={cx("flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition", on ? "border-brand-500 bg-brand-600 text-white shadow-md" : "border-slate-200 bg-surface text-slate-700 hover:border-brand-300 hover:text-brand-700")}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {/* Look-and-feel styles */}
      <div className={cx("flex flex-wrap items-center gap-1.5", compact ? "mb-2" : "mb-4")} role="group" aria-label="Style">
        <span className="mr-1 text-xs font-semibold text-slate-500">Style</span>
        {(["", ...STYLES] as const).map((v) => (
          <button
            key={v || "all"}
            aria-pressed={style === v}
            onClick={() => setStyle(v)}
            className={cx("rounded-full px-3 py-1 text-xs font-semibold transition", style === v ? "bg-[#10152b] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
          >
            {v || "All"}
          </button>
        ))}
      </div>

      <div className={cx("flex flex-wrap gap-2", compact ? "mb-3" : "mb-4")}>
        <label className="relative min-w-0 flex-1 basis-40">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className="input py-1.5 pl-8 text-xs" placeholder="Search role, country, style, industry…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search templates" />
        </label>
        <select className={select} value={market} onChange={(e) => setMarket(e.target.value)} aria-label="Country or market"><option value="">All countries</option>{MARKETS.map((m) => <option key={m}>{m}</option>)}</select>
        <select className={select} value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} aria-label="Layout"><option value="">ATS-first & Visual</option><option value="ats">ATS-first</option><option value="visual">Visual</option></select>
        <select className={select} value={tier} onChange={(e) => setTier(e.target.value as typeof tier)} aria-label="Plan"><option value="">Free & Pro</option><option value="free">Free</option><option value="pro">Pro</option></select>
        <select className={select} value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Career level"><option value="">All levels</option>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        {list.length} templates · {counts.free} free · {counts.pro} Pro · original CareerMatch designs built on each market&apos;s and field&apos;s conventions. Click any design to see it full size.
      </p>

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No templates match these filters. Try another role or country.</p>
      ) : (
        <div className={cx("grid gap-5", compact ? "grid-cols-1" : "grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))]")}>
          {list.map((t) => {
            const locked = t.tier === "pro" && !canUsePro;
            const doc = docFor(t);
            return (
              <article
                key={t.id}
                className={cx("group relative flex flex-col overflow-hidden rounded-2xl border bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(16,21,43,0.45)]", selected === t.id ? "border-brand-500 ring-2 ring-brand-500" : "border-slate-200")}
              >
                <button type="button" onClick={() => setPreview(t)} className="relative block bg-gradient-to-br from-slate-100 to-slate-200/70 p-4 text-left focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" aria-label={`Preview ${t.name}`}>
                  <Thumb doc={doc} />
                  <span className="absolute top-3 left-3 flex gap-1"><TierBadge tier={t.tier} /><ModeBadge mode={t.mode} /></span>
                  <span className="pointer-events-none absolute inset-0 grid place-items-center bg-[#10152b]/0 opacity-0 transition group-hover:bg-[#10152b]/25 group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#10152b] shadow-lg"><Eye className="size-4" aria-hidden /> Preview</span>
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.market} · {t.paper} · {t.pages} pages</p>
                  </div>
                  {onPick && (
                    <button type="button" onClick={() => onPick(t)} className={cx("mt-auto rounded-full px-3 py-1.5 text-xs font-bold transition", selected === t.id ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100")}>
                      {selected === t.id ? "Selected" : locked ? "Use · Pro to download" : "Use this template"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {preview && <PreviewModal t={preview} doc={docFor(preview)} locked={preview.tier === "pro" && !canUsePro} onClose={closePreview} onPick={onPick ? () => onPick(preview) : undefined} />}
    </div>
  );
}
