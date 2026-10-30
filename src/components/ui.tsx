import Link from "next/link";
import { cx } from "@/lib/format";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-slate-900", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-sm text-white shadow-sm">CM</span>
      CareerMatch<span className="text-brand-600">AI</span>
    </Link>
  );
}

export function ScoreRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 75 ? "stroke-emerald-500" : value >= 50 ? "stroke-amber-500" : "stroke-rose-500";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} aria-label={`${label ?? "Score"}: ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} className="fill-none stroke-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} strokeLinecap="round" className={cx("fill-none transition-all", color)} strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="absolute font-display text-sm font-bold text-slate-900" style={{ fontSize: size / 4 }}>{value}</span>
    </div>
  );
}

export function SourceBadge({ kind, name, stale }: { kind: string; name: string; stale?: boolean }) {
  const styles: Record<string, string> = {
    demo: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    user_link: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    employer_feed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    official_api: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    aggregator: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  };
  return (
    <span className="flex flex-wrap gap-1.5">
      <span className={cx("chip", styles[kind] ?? styles.aggregator)}>
        {kind === "demo" ? "Demo data · not a real job" : `Source: ${name}`}
      </span>
      {stale && <span className="chip bg-rose-50 text-rose-700 ring-1 ring-rose-200">May be stale</span>}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">✦</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-md text-sm text-slate-600">{body}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

type MatchLike = { score: number; breakdown: { label: string; points: number; max: number }[] };

/** Score ring with an accessible hover/focus popover explaining the points. */
export function ScoreExplainer({ match, size = 56 }: { match: MatchLike; size?: number }) {
  return (
    <div className="group relative flex flex-col items-center">
      <button type="button" className="rounded-full focus-visible:outline-2 focus-visible:outline-brand-500" aria-label={`Match score ${match.score}: ${match.breakdown.map((b) => `${b.label} ${b.points} of ${b.max}`).join(", ")}`}>
        <ScoreRing value={match.score} size={size} label="Match score" />
      </button>
      <span className="mt-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">Match ⓘ</span>
      <div role="tooltip" className="pointer-events-none invisible absolute top-full right-0 z-20 mt-2 w-60 rounded-xl bg-[#0f172a] p-3 text-left text-xs text-white opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <p className="mb-2 font-semibold">How this score is built</p>
        {match.breakdown.map((b) => (
          <div key={b.label} className="flex justify-between gap-3 py-0.5">
            <span className="text-slate-300">{b.label}</span>
            <span className="tabular-nums">{b.points}/{b.max}</span>
          </div>
        ))}
        <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">75+ strong · 50–74 reasonable · under 50 stretch</p>
      </div>
    </div>
  );
}
