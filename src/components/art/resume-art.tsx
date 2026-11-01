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
        <div key={i} className="rs-line h-1.5 rounded-full bg-[#e3e8f5]" style={{ ...idx(start + i), width: `${w}%` }} />
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

type SamplePerson = { name: string; role: string; city: string };
const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function ResumeArt({ accent = "#4263ff", score = 92, className, label = "Sample résumé", person = { name: "Nisha Kulkarni", role: "Senior Product Analyst", city: "Bengaluru" } }: { accent?: string; score?: number; className?: string; label?: string; person?: SamplePerson }) {
  const rest = +(C * (1 - score / 100)).toFixed(1);
  return (
    <figure className={cx("relative w-full overflow-hidden rounded-[1.1rem] border border-[#e3e8f5] bg-white p-5 text-left shadow-[0_30px_60px_-28px_rgba(16,21,43,0.35)]", className)} aria-label={label}>
      {/* scan line */}
      <div aria-hidden className="rs-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-transparent via-[#4263ff]/20 to-transparent" style={{ "--h": "330px" } as React.CSSProperties} />

      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ background: `linear-gradient(135deg, ${accent}, #8457ff)` }}>{initialsOf(person.name)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-tight font-bold text-[#10152b]">{person.name}</p>
          <p className="text-[11px] text-[#5b6170]">{person.role} · {person.city}</p>
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
          <span className="font-medium text-[#8a90a0]">2021 – Now</span>
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
      <figcaption className="mt-4 text-[10px] text-[#8a90a0]">{label}, for illustration</figcaption>
    </figure>
  );
}

/** A sample cover letter that writes itself and signs off. Same 9s loop as the résumé. */
export function CoverLetterArt({ accent = "#8457ff", className, person = { name: "Rohan Kapoor", city: "Mumbai", email: "rohan@example.com" } }: { accent?: string; className?: string; person?: { name: string; city: string; email: string } }) {
  return (
    <figure className={cx("relative w-full overflow-hidden bg-white p-5 text-left", className)} aria-label="Sample cover letter">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[15px] leading-tight font-bold text-[#10152b]">{person.name}</p>
          <p className="text-[11px] text-[#5b6170]">{person.city} · {person.email}</p>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: accent }}>Confident tone</span>
      </div>
      <p className="mt-4 text-[11px] font-semibold text-[#10152b]">Dear Hiring Team at Northwind,</p>
      <div className="mt-2.5"><Lines rows={[100, 94, 86]} start={1} /></div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["SAP Ariba", "Spend analysis", "Stakeholders"].map((k, i) => (
          <span key={k} className="rs-pop rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ ...idx(i), background: "#efe9ff", color: "#5b34d6" }}>✓ {k}</span>
        ))}
      </div>
      <div className="mt-2.5"><Lines rows={[96, 90, 72]} start={4} /></div>
      <div className="mt-2.5"><Lines rows={[88, 60]} start={7} /></div>
      <p className="mt-4 text-[11px] text-[#5b6170]">Warm regards,</p>
      <svg viewBox="0 0 160 40" className="mt-1 h-9 w-36" aria-hidden>
        <path className="sig-draw" d="M4 28c10-16 18-20 22-12s-6 16 2 10 14-22 20-14-4 18 4 12 10-14 16-8 6 10 14 4 12-10 20-6 10 6 18 2 12-6 30-4" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <figcaption className="mt-2 text-[10px] text-[#8a90a0]">Sample cover letter, for illustration</figcaption>
    </figure>
  );
}

/** A sample ATS report: score ring plus keyword-match bars that fill in. */
export function AtsReportArt({ score = 86, className }: { score?: number; className?: string }) {
  const rest = +(C * (1 - score / 100)).toFixed(1);
  const rows: [string, number, string][] = [["Hard skills", 92, "#20c997"], ["Job title", 85, "#4263ff"], ["Experience", 78, "#8457ff"], ["Soft skills", 64, "#ffc857"]];
  return (
    <figure className={cx("relative w-full overflow-hidden bg-white p-5 text-left", className)} aria-label="Sample ATS report">
      <div className="flex items-center gap-4">
        <div className="relative size-[66px] shrink-0">
          <svg viewBox="0 0 54 54" className="size-full -rotate-90" aria-hidden>
            <circle cx="27" cy="27" r={R} fill="none" stroke="#e7ecfb" strokeWidth="5" />
            <circle cx="27" cy="27" r={R} fill="none" stroke="#4263ff" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} className="rs-ring" style={{ "--full": C.toFixed(1), "--rest": rest } as React.CSSProperties} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-base font-extrabold text-[#10152b] tabular-nums"><span className="rs-score" style={{ "--to": score } as React.CSSProperties} aria-label={`ATS score ${score}`} /></span>
        </div>
        <div>
          <p className="text-[15px] leading-tight font-bold text-[#10152b]">ATS alignment</p>
          <p className="text-[11px] text-[#5b6170]">Product Analyst · Northwind</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {rows.map(([label, v, color], i) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#10152b]"><span>{label}</span><span className="tabular-nums">{v}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#eef1f8]"><div className="rs-fill h-full rounded-full" style={{ ...idx(i), width: `${v}%`, background: color }} /></div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {[["Power BI", true], ["SQL", true], ["Coupa", false]].map(([k, ok], i) => (
          <span key={String(k)} className="rs-pop rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ ...idx(i + 2), background: ok ? "#dff7ee" : "#ffe9e7", color: ok ? "#0b7a5a" : "#c4413a" }}>{ok ? "✓" : "✗"} {String(k)}</span>
        ))}
      </div>
      <figcaption className="mt-3 text-[10px] text-[#8a90a0]">Estimate on a sample, not an employer&apos;s ATS score</figcaption>
    </figure>
  );
}
