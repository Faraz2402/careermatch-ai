import Link from "next/link";
import { cx } from "@/lib/format";
import { COUNTRY_NAMES, FLAG, LEVEL_LABEL, NOTICE, type DocFormat } from "@/lib/resume-examples/shared";
import type { Sample } from "@/lib/resume-examples/types";
import { PAGE_PX, ResumeDoc } from "./resume-doc";
import { Scaled } from "./scaled";

/** A résumé card: the real résumé component, scaled down, with its country and level. */
export function SampleCard({ sample, format, href, label, sub, className }: { sample: Sample; format: DocFormat; href: string; label?: string; sub?: string; className?: string }) {
  const page = PAGE_PX[format.paper];
  return (
    <Link href={href} className={cx("group block min-w-0", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-brand-500">
        <div aria-hidden className="pointer-events-none select-none">
          <Scaled pageW={page.w} pageH={page.h} crop initial={0.32}>
            <ResumeDoc sample={sample} format={format} />
          </Scaled>
        </div>
        <span className="absolute top-2.5 left-2.5 rounded-full bg-[#10152b]/85 px-2 py-0.5 text-[10px] font-bold text-white">{FLAG[sample.country]} {sample.country.toUpperCase()} · {LEVEL_LABEL[sample.level]}</span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-transparent px-3 pt-6 pb-2 text-[10px] leading-tight font-semibold text-slate-500">{NOTICE}</span>
      </div>
      <p className="mt-2.5 font-display text-[15px] leading-snug font-bold text-slate-900 group-hover:text-brand-700">{label ?? sample.content.title}</p>
      <p className="text-xs text-slate-500">{sub ?? `${COUNTRY_NAMES[sample.country]} · ${format.paper} · ${format.term === "CV" ? "CV" : "Resume"}`}</p>
    </Link>
  );
}
