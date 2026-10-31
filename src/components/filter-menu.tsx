"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";

type Option = { id: string; label: string };

type Props = {
  label: string;
  options: Option[];
  /** "single" renders radios (Date posted); "multi" renders checkboxes (Experience level). */
  mode: "single" | "multi";
  value: string[];
  /** The value that means "no filter" (shown un-highlighted). */
  defaultValue: string[];
  onApply: (value: string[]) => void;
  /** Total results the pending selection would show. */
  countFor: (value: string[]) => Promise<number>;
};

/** Filter pill + popover: pick options, see the live result count, apply. */
export function FilterMenu({ label, options, mode, value, defaultValue, onApply, countFor }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const [count, setCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const active = value.join() !== defaultValue.join();
  const summary = active ? (mode === "single" ? options.find((o) => o.id === value[0])?.label : value.length === 1 ? options.find((o) => o.id === value[0])?.label : `${value.length} selected`) : null;

  useEffect(() => {
    if (open) setPending(value);
  }, [open, value]);

  // Live count for the pending selection (debounced).
  useEffect(() => {
    if (!open) return;
    let live = true;
    setCount(null);
    const t = setTimeout(() => {
      countFor(pending).then((n) => live && setCount(n)).catch(() => live && setCount(null));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [open, pending, countFor]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const toggle = (id: string) =>
    setPending((p) => (mode === "single" ? [id] : p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition",
          active ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-surface text-slate-700 hover:border-slate-400",
        )}
      >
        {summary ?? label} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="dialog" aria-label={label} className="card absolute left-0 z-40 mt-2 w-72 p-0 shadow-xl">
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-semibold">{label}</p>
            <button type="button" aria-label="Close" className="text-lg text-slate-500 hover:text-slate-900" onClick={() => setOpen(false)}>✕</button>
          </div>
          <fieldset className="space-y-1 px-2 py-2">
            <legend className="sr-only">{label}</legend>
            {options.map((o) => {
              const checked = pending.includes(o.id);
              return (
                <label key={o.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                  <input
                    type={mode === "single" ? "radio" : "checkbox"}
                    name={label}
                    checked={checked}
                    onChange={() => toggle(o.id)}
                    className="size-5 accent-emerald-700"
                  />
                  {o.label}
                </label>
              );
            })}
          </fieldset>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn rounded-full bg-brand-600 px-4 py-1.5 text-white hover:bg-brand-500"
              onClick={() => {
                onApply(pending);
                setOpen(false);
              }}
            >
              {count == null ? "Show results" : `Show ${count.toLocaleString()} result${count === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
