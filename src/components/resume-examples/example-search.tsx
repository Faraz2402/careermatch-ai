"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type Item = { name: string; href: string; group: string };

/** Instant role/category search over the published examples (client-side, no network). */
export function ExampleSearch({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return items.filter((i) => i.name.toLowerCase().includes(t) || i.group.toLowerCase().includes(t)).slice(0, 8);
  }, [q, items]);
  return (
    <div className="relative mx-auto mt-6 max-w-xl">
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a job title, e.g. nurse, accountant, developer" className="input !rounded-full !py-3.5 pl-12 text-base shadow-sm" aria-label="Search resume examples" role="combobox" aria-expanded={hits.length > 0} aria-controls="rx-search-results" autoComplete="off" />
      </label>
      {q.trim().length >= 2 && (
        <div id="rx-search-results" role="listbox" className="card menu-in absolute inset-x-0 top-full z-30 mt-2 overflow-hidden p-1.5 text-left shadow-2xl">
          {hits.length ? (
            hits.map((h) => (
              <Link key={h.href} href={h.href} role="option" aria-selected={false} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-brand-50">
                <span><b className="text-slate-900">{h.name}</b> <span className="text-slate-500">· {h.group}</span></span>
                <ArrowRight className="size-4 text-brand-600" aria-hidden />
              </Link>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-slate-600">No examples for &ldquo;{q.trim()}&rdquo; yet. Try a broader title, or browse the categories below.</p>
          )}
        </div>
      )}
    </div>
  );
}
