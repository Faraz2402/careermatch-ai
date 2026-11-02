"use client";

import { useId, useState } from "react";
import { cx } from "@/lib/format";

/** Accessible tabs over server-rendered panels. */
export function Tabs({ tabs }: { tabs: { label: string; panel: React.ReactNode }[] }) {
  const [i, setI] = useState(0);
  const id = useId();
  return (
    <div>
      <div role="tablist" aria-label="Filter examples" className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 sm:w-fit">
        {tabs.map((t, k) => (
          <button key={t.label} role="tab" id={`${id}-t${k}`} aria-selected={i === k} aria-controls={`${id}-p${k}`} onClick={() => setI(k)} className={cx("shrink-0 rounded-xl px-4 py-2 text-sm font-bold whitespace-nowrap transition", i === k ? "bg-surface text-brand-700 shadow" : "text-slate-600 hover:text-slate-900")}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, k) => (
        <div key={t.label} role="tabpanel" id={`${id}-p${k}`} aria-labelledby={`${id}-t${k}`} hidden={i !== k} className="mt-5">
          {t.panel}
        </div>
      ))}
    </div>
  );
}
