import { cx } from "@/lib/format";

/**
 * A sample résumé that writes itself: lines draw in, keyword chips pop, a scan
 * line sweeps down and the ATS ring fills. Decorative and labelled as a sample;
 * the animation lives in globals.css (.rs-*), is transform/opacity-only, and is
 * disabled for prefers-reduced-motion.
 */

const R = 21;
const C = 2 * Math.PI * R;

const idx = (i: number) => ({ "--i": i }) as React.CSSProperties;

function Lines({ rows, start = 0 }: { rows: number[]; start?: number }) {
  return (
    <div className="space-y-1.5">
      {rows.map((w, i) => (
        <div key={i} className="rs-line h-1.5 rounded-full bg-slate-200" style={{ ...idx(start + i), width: `${w}%` }} />
      ))}
    </div>
  );
}

function Heading({ children, accent }: { children: string; accent: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: accent }}>
      {children}
      <span className="h-px flex-1 opacity-30" style={{ background: accent }} />
    </p>
  );
}

export function ResumeArt({ accent = "#4263ff", score = 92, className, label = "Sample résumé" }: { accent?: string; score?: number; className?: string; label?: string }) {
  const rest = +(C * (1 - score / 100)).toFixed(1);
  return (
    <figure className={cx("relative w-full overflow-hidden rounded-[1.1rem] border border-slate-200 bg-white p-5 text-left shadow-[0_30px_60px_-28px_rgba(16,21,43,0.35)]", className)} aria-label={label}>
      {/* scan line */}
      <div aria-hidden className="rs-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-transparent via-[#4263ff]/20 to-transparent" style={{ "--h": "330px" } as React.CSSProperties} />

      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${accent}, #8457ff)` }}>PS</div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tight font-bold text-[#10152b]">Priya Sharma</p>
          <p className="text-[11px] text-slate-500">Senior Product Analyst · Bengaluru</p>
        </div>
        {/* ATS ring */}
        <div className="relative size-[54px] shrink-0">
          <svg viewBox="0 0 54 54" className="size-full -rotate-90" aria-hidden>
            <circle cx="27" cy="27" r={R} fill="none" stroke="#e7ecfb" strokeWidth="5" />
            <circle cx="27" cy="27" r={R} fill="none" stroke="#20c997" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} className="rs-ring" style={{ "--full": C.toFixed(1), "--rest": rest } as React.CSSProperties} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-[13px] font-extrabold text-[#10152b] tabular-nums">
            <span className="rs-score" style={{ "--to": score } as React.CSSProperties} aria-label={`ATS score ${score}`} />
          </span>
        </div>
      </div>

      <div className="mt-5">
        <Heading accent={accent}>Summary</Heading>
        <Lines rows={[100, 92, 64]} start={1} />
      </div>

      <div className="mt-5">
        <Heading accent={accent}>Experience</Heading>
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[#10152b]">
          <span>Product Analyst, Acme Retail</span>
          <span className="font-medium text-slate-400">2021 – Now</span>
        </div>
        <Lines rows={[96, 88, 72, 94, 58]} start={4} />
      </div>

      <div className="mt-5">
        <Heading accent={accent}>Skills</Heading>
        <div className="flex flex-wrap gap-1.5">
          {[["SQL", true], ["Python", true], ["Power BI", true], ["Stakeholders", true], ["A/B testing", false]].map(([k, ok], i) => (
            <span
              key={String(k)}
              className="rs-pop inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
              style={{ ...idx(i), background: ok ? "#dff7ee" : "#ffe9e7", color: ok ? "#0b7a5a" : "#c4413a" }}
            >
              {ok ? "✓" : "+"} {k}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-4 text-[10px] text-slate-400">{label}, for illustration</figcaption>
    </figure>
  );
}
