"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { cx } from "@/lib/format";
import { COUNTRY_NAMES, FLAG, LEVEL_LABEL, sampleHref, type DocFormat } from "@/lib/resume-examples/shared";
import { COUNTRY_CODES, type CountryCode, type Sample } from "@/lib/resume-examples/types";
import { SampleCard } from "./sample-card";

type Data = { format: DocFormat; samples: Sample[] };

/** Home page: 12 featured examples with a country selector and category buttons (static data via a cached API). */
export function HomeExamples({ initial, categories, roleNames }: { initial: Data; categories: { slug: string; name: string }[]; roleNames: Record<string, string> }) {
  const [country, setCountry] = useState<CountryCode>("us");
  const [category, setCategory] = useState("");
  const [data, setData] = useState<Data>(initial);
  const [busy, setBusy] = useState(false);
  const req = useRef(0);
  const load = async (c: CountryCode, cat: string) => {
    setCountry(c);
    setCategory(cat);
    const n = ++req.current;
    setBusy(true);
    try {
      const r = await fetch(`/api/resume-examples/featured?country=${c}${cat ? `&category=${cat}` : ""}`);
      if (r.ok && n === req.current) setData((await r.json()) as Data);
    } finally {
      if (n === req.current) setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          Country
          <select value={country} onChange={(e) => load(e.target.value as CountryCode, category)} className="input !w-auto !rounded-full !py-2 pr-9 font-semibold" aria-label="Country">
            {COUNTRY_CODES.map((c) => <option key={c} value={c}>{FLAG[c]} {COUNTRY_NAMES[c]}</option>)}
          </select>
          {busy && <Loader2 className="size-4 animate-spin text-brand-600" aria-label="Loading" />}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap" role="group" aria-label="Job category">
          {[{ slug: "", name: "All" }, ...categories].map((c) => (
            <button key={c.slug} type="button" aria-pressed={category === c.slug} onClick={() => load(country, c.slug)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition", category === c.slug ? "border-transparent bg-brand-600 text-white shadow" : "border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-700")}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className={cx("mt-8 grid grid-cols-2 gap-5 transition-opacity sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6", busy && "opacity-60")} aria-live="polite">
        {data.samples.map((s) => <SampleCard key={s.id} sample={s} format={data.format} href={sampleHref(s)} label={roleNames[s.role] ?? s.content.title} sub={`${LEVEL_LABEL[s.level]} · ${s.content.location}`} />)}
      </div>
      <div className="mt-10 text-center">
        <Link href="/resume-examples" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#10152b] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">View all examples <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
    </div>
  );
}
