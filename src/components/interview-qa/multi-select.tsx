"use client";

import { Check, ChevronDown, Search, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cx } from "@/lib/format";

export type Option = { value: string; count?: number; group?: string };

/** Dropdown multi-select with typeahead, optional groups and result counts. */
export function MultiSelect({ label, icon: Icon, tone, options, selected, onChange, placeholder = "Search…", disabledHint }: { label: string; icon: LucideIcon; tone: string; options: Option[]; selected: string[]; onChange: (v: string[]) => void; placeholder?: string; disabledHint?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const shown = useMemo(() => options.filter((o) => o.value.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const groups = useMemo(() => [...new Set(shown.map((o) => o.group ?? ""))], [shown]);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const disabled = options.length === 0;

  return (
    <div ref={wrap} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        title={disabled ? disabledHint : undefined}
        className={cx(
          "flex w-full items-center gap-2 rounded-2xl border bg-surface px-3.5 py-2.5 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
          selected.length ? "border-transparent text-white shadow-md" : "border-slate-200 text-slate-700",
        )}
        style={selected.length ? { background: `linear-gradient(135deg, ${tone}, ${tone}cc)` } : undefined}
      >
        <Icon className={cx("size-4 shrink-0", selected.length ? "text-white" : "")} style={selected.length ? undefined : { color: tone }} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{selected.length ? (selected.length === 1 ? selected[0] : `${label} · ${selected.length}`) : label}</span>
        {selected.length > 0 ? (
          <span role="button" tabIndex={0} aria-label={`Clear ${label}`} onClick={(e) => { e.stopPropagation(); onChange([]); }} onKeyDown={(e) => e.key === "Enter" && onChange([])} className="grid size-5 place-items-center rounded-full bg-white/25 hover:bg-white/40">
            <X className="size-3" />
          </span>
        ) : (
          <ChevronDown className={cx("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} aria-hidden />
        )}
      </button>
      {open && (
        <div id={listId} className="card menu-in absolute top-full left-0 z-40 mt-2 w-[min(22rem,90vw)] overflow-hidden p-2 shadow-2xl">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="input py-1.5 pl-8 text-sm" aria-label={`Search ${label}`} />
          </label>
          <div className="mt-2 max-h-72 overflow-y-auto pr-1" role="listbox" aria-multiselectable="true" aria-label={label}>
            {shown.length === 0 && <p className="px-2 py-3 text-center text-xs text-slate-500">No matches</p>}
            {groups.map((g) => (
              <div key={g || "all"}>
                {g && <p className="sticky top-0 bg-surface px-2 pt-2 pb-1 text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{g}</p>}
                {shown.filter((o) => (o.group ?? "") === g).map((o) => {
                  const on = selected.includes(o.value);
                  return (
                    <button key={o.value} type="button" role="option" aria-selected={on} onClick={() => toggle(o.value)} className={cx("flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition", on ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100")}>
                      <span className={cx("grid size-4 shrink-0 place-items-center rounded-md border", on ? "border-transparent text-white" : "border-slate-300")} style={on ? { background: tone } : undefined}>{on && <Check className="size-3" />}</span>
                      <span className="min-w-0 flex-1 truncate">{o.value}</span>
                      {o.count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-500 tabular-nums">{o.count}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-lg py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Clear {label.toLowerCase()}</button>}
        </div>
      )}
    </div>
  );
}
