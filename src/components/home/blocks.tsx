import { ArrowRight, BadgeCheck, Calendar, MapPin, Star, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cx } from "@/lib/format";
import { AtsReportArt, CoverLetterArt, ResumeArt } from "@/components/art/resume-art";

/** Licensed Unsplash photographs, stored in /public/people. */
export type PhotoName = "hero-main" | "hero-face-a" | "hero-face-b" | "portrait-emma" | "portrait-marcus" | "portrait-daniel" | "portrait-sara" | "portrait-lena" | "persona-grad" | "persona-early" | "persona-senior" | "persona-switch" | "laptop-cafe" | "team";

export function Photo({ name, alt, className, sizes, priority, position = "center", zoom }: { name: PhotoName; alt: string; className?: string; sizes: string; priority?: boolean; position?: string; zoom?: number }) {
  return (
    <div className={cx("overflow-hidden bg-[#111a3d]", className)}>
      <Image src={`/people/${name}.jpg`} alt={alt} fill sizes={sizes} priority={priority} quality={90} className="object-cover" style={{ objectPosition: position, ...(zoom && { transform: `scale(${zoom})`, transformOrigin: position }) }} />
    </div>
  );
}

const card = "rounded-2xl bg-white text-[#10152b] shadow-[0_24px_60px_-24px_rgba(16,21,43,0.55)]";

/** A mini match ring used inside the floating cards. */
function Ring({ value, size = 46, track = "#e7ecfb" }: { value: number; size?: number; track?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${value}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#20c997" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="800" fill="#10152b" className="rotate-90 origin-center">{value}</text>
    </svg>
  );
}

/** Hero artwork: arch-framed photographs over flat colour shapes, with floating product cards. */
export function HeroCollage({ className }: { className?: string }) {
  return (
    <div className={cx("relative mx-auto aspect-[1/1.04] w-full max-w-[40rem]", className)}>
      {/* flat shapes */}
      <div aria-hidden className="absolute right-[2%] bottom-[2%] size-[46%] rounded-full bg-[#ff8f7a]" />
      <div aria-hidden className="absolute top-[4%] left-[0%] h-[30%] w-[30%] rounded-br-[100%] bg-[#4263ff]" />
      <div aria-hidden className="absolute top-[40%] left-[-2%] size-[12%] rounded-full bg-[#ffc857]" />
      <div aria-hidden className="absolute right-[6%] top-[2%] h-[16%] w-[16%] rounded-t-full bg-[#19c6e8]" />
      <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full opacity-40" fill="none" stroke="#a3b8ff" strokeWidth=".35">
        <path d="M0 78 Q 50 40 100 66" />
        <path d="M0 86 Q 50 50 100 74" />
        <path d="M0 94 Q 50 60 100 82" />
      </svg>

      {/* arch photo */}
      <Photo name="hero-main" alt="A smiling professional at her desk in a bright office" priority sizes="(min-width: 1024px) 44rem, 100vw" position="50% 30%" className="absolute top-[3%] left-[14%] h-[86%] w-[60%] rounded-t-[999px] rounded-b-[2rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] ring-1 ring-white/10" />
      {/* round photos */}
      <Photo name="hero-face-a" alt="A smiling professional in a blue suit" priority sizes="(min-width: 1024px) 26rem, 60vw" position="50% 22%" zoom={1.15} className="absolute top-[34%] right-[0%] size-[34%] rounded-full border-[6px] border-[#070b16] ring-1 ring-white/15" />
      <Photo name="hero-face-b" alt="A confident businesswoman in a black suit" priority sizes="(min-width: 1024px) 36rem, 84vw" position="50% 14%" zoom={1.9} className="absolute bottom-[6%] left-[3%] size-[24%] rounded-full border-[6px] border-[#070b16] ring-1 ring-white/15" />

      {/* floating product cards (illustrative) */}
      <div className={cx(card, "float-a absolute top-[8%] right-[3%] flex items-center gap-2.5 px-3.5 py-2.5 sm:right-[-3%]")}>
        <span className="grid size-8 place-items-center rounded-xl bg-[#dff7ee] text-[#0b7a5a]"><BadgeCheck className="size-[18px]" aria-hidden /></span>
        <span className="text-xs leading-tight"><b className="block text-[13px]">Keyword match</b><span className="text-[#5b6170]">5 of 6 with evidence</span></span>
      </div>
      <div className={cx(card, "float-b absolute bottom-[14%] right-[-1%] w-[11.5rem] p-3 sm:right-[-5%]")}>
        <div className="flex items-center gap-3">
          <Ring value={92} />
          <span className="text-xs leading-tight"><b className="block text-[13px]">ATS alignment</b><span className="text-[#5b6170]">Sample résumé</span></span>
        </div>
      </div>
      <div className="glow-border float-c absolute bottom-[-4%] left-[27%] hidden w-[34%] sm:block">
        <div className="overflow-hidden bg-white p-3">
          <div className="flex items-center justify-between"><span className="text-[11px] font-bold text-[#10152b]">Cover letter</span><span className="rounded-full bg-[#efe9ff] px-1.5 py-0.5 text-[9px] font-bold text-[#5b34d6]">Tailored</span></div>
          <div className="mt-2 space-y-1">{[100, 92, 84, 96, 70].map((w, i) => <div key={i} className="rs-line h-1 rounded-full bg-[#e3e8f5]" style={{ width: `${w}%`, "--i": i } as React.CSSProperties} />)}</div>
        </div>
      </div>
    </div>
  );
}

const TILE_LINK = "grid size-10 shrink-0 place-items-center rounded-full border border-current transition hover:bg-current/10";

/** The three product tiles: coloured stage with a floating profile card, a title and a circular arrow. */
export function ProductTiles({ href }: { href: string }) {
  return (
    <div className="grid gap-x-5 gap-y-10 md:grid-cols-3">
      {/* Tailoring */}
      <article className="reveal group">
        <div className="relative h-[24rem] overflow-hidden rounded-[1.4rem] bg-[#1b2a6b] transition-transform duration-500 group-hover:-translate-y-1">
          <div aria-hidden className="absolute -bottom-16 -left-10 size-56 rounded-full bg-[#2b3f9e]" />
          <div aria-hidden className="absolute -top-10 -right-12 size-44 rounded-full bg-[#3a2a85]" />
          <div className={cx(card, "absolute top-[16%] left-[10%] w-[58%] -rotate-3 p-4 opacity-60")} aria-hidden>
            <div className="h-2 w-2/3 rounded-full bg-[#e3e8f5]" /><div className="mt-2 h-2 w-1/2 rounded-full bg-[#eef1f8]" />
          </div>
          <div className={cx(card, "float-a absolute top-[12%] right-[8%] left-[18%] p-5 text-center")}>
            <Photo name="portrait-emma" alt="Portrait of a smiling professional" sizes="200px" position="50% 22%" className="relative mx-auto size-20 rounded-full" />
            <p className="mt-3 text-lg font-extrabold">Hannah Reid</p>
            <p className="text-xs text-[#5b6170]">Senior Product Analyst</p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              <span className="rounded-full bg-[#dff7ee] px-2.5 py-1 text-[11px] font-bold text-[#0b7a5a]">ATS 92</span>
              <span className="rounded-full bg-[#e3ebff] px-2.5 py-1 text-[11px] font-bold text-[#2f3fd0]">SQL</span>
              <span className="rounded-full bg-[#e3ebff] px-2.5 py-1 text-[11px] font-bold text-[#2f3fd0]">Power BI</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-300 pt-4 text-slate-900">
          <div>
            <h3 className="font-serif text-4xl leading-tight">Tailoring</h3>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600">A résumé and cover letter rewritten for each role, with your own evidence quoted.</p>
          </div>
          <Link href={href} aria-label="Start tailoring" className={cx(TILE_LINK, "text-[#a3b8ff]")}><ArrowRight className="size-5" /></Link>
        </div>
      </article>

      {/* Matching */}
      <article className="reveal group" style={{ "--delay": "90ms" } as React.CSSProperties}>
        <div className="relative h-[24rem] overflow-hidden rounded-[1.4rem] bg-[#0a4a42] transition-transform duration-500 group-hover:-translate-y-1">
          <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full" fill="none" stroke="#1fae8f" strokeWidth=".6" opacity=".5">
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M-10 ${150 + i * 8} Q 70 ${90 + i * 8} 210 ${130 + i * 6}`} />)}
          </svg>
          <div className={cx(card, "float-b absolute top-[14%] right-[9%] left-[9%] p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-[#5b6170] uppercase">Skill match</p>
                <p className="mt-1 text-lg leading-snug font-extrabold">Senior Procurement Analyst</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#5b6170]"><MapPin className="size-3" aria-hidden />Bengaluru · Hybrid</p>
              </div>
              <Ring value={86} size={52} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
              {["SAP Ariba", "P2P", "Power BI"].map((k) => <span key={k} className="rounded-full bg-[#dff7ee] px-2.5 py-1 text-[#0b7a5a]">✓ {k}</span>)}
              <span className="rounded-full bg-[#ffe9e7] px-2.5 py-1 text-[#c4413a]">✗ Coupa</span>
            </div>
          </div>
          <div className={cx(card, "float-a absolute right-[12%] bottom-[9%] flex items-center gap-2 px-3 py-2")}>
            <Photo name="portrait-marcus" alt="Portrait of a professional in a suit" sizes="96px" position="50% 25%" className="relative size-8 rounded-full" />
            <span className="text-xs font-bold">Original posting verified</span>
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-300 pt-4 text-slate-900">
          <div>
            <h3 className="font-serif text-4xl leading-tight">Matching</h3>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600">Fresh roles from India and worldwide, each scored with its working shown.</p>
          </div>
          <Link href={href} aria-label="Start matching" className={cx(TILE_LINK, "text-[#5fd3b6]")}><ArrowRight className="size-5" /></Link>
        </div>
      </article>

      {/* Tracking */}
      <article className="reveal group" style={{ "--delay": "180ms" } as React.CSSProperties}>
        <div className="relative h-[24rem] overflow-hidden rounded-[1.4rem] bg-[#4a1630] transition-transform duration-500 group-hover:-translate-y-1">
          <div aria-hidden className="absolute -right-10 -bottom-14 size-56 rounded-full bg-[#8a2346]" />
          <div aria-hidden className="absolute top-8 -left-8 size-28 rounded-full bg-[#6b2050]" />
          <div className={cx(card, "float-a absolute top-[11%] right-[10%] left-[14%] p-5 text-center")}>
            <Photo name="portrait-daniel" alt="Portrait of a hiring manager" sizes="200px" position="50% 22%" className="relative mx-auto size-16 rounded-full" />
            <p className="mt-2 text-lg font-extrabold">Interview stage</p>
            <p className="flex items-center justify-center gap-1 text-xs text-[#5b6170]"><Calendar className="size-3" aria-hidden />Follow-up reminder set</p>
            <div className="mt-3 space-y-2 text-left">
              {[["Applied", "Operations Manager", Star], ["Interview", "Product Analyst", ThumbsUp]].map(([a, b, I]) => {
                const Icon = I as typeof Star;
                return (
                  <div key={String(a)} className="flex items-center justify-between rounded-xl bg-[#fff1e8] px-3 py-2">
                    <span className="text-xs leading-tight"><b className="block">{String(a)}</b><span className="text-[#5b6170]">{String(b)}</span></span>
                    <span className="grid size-7 place-items-center rounded-full bg-[#10152b] text-white"><Icon className="size-3.5" aria-hidden /></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 border-t border-slate-300 pt-4 text-slate-900">
          <div>
            <h3 className="font-serif text-4xl leading-tight">Tracking</h3>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-slate-600">Every application from saved to offer, with notes, reminders and mock interviews.</p>
          </div>
          <Link href={href} aria-label="Start tracking" className={cx(TILE_LINK, "text-[#ff9a7a]")}><ArrowRight className="size-5" /></Link>
        </div>
      </article>
    </div>
  );
}

/** Studio split artwork: a large photograph with the animated résumé laid over it. */
export function StudioCollage({ className }: { className?: string }) {
  return (
    <div className={cx("relative mx-auto w-full max-w-[40rem] pb-10", className)}>
      <Photo name="laptop-cafe" alt="A woman smiling with a laptop on her knees in a bright lounge" sizes="(min-width: 1024px) 56rem, 100vw" position="50% 40%" className="relative aspect-[4/3.6] w-[78%] rounded-[1.6rem]" />
      <div className="glow-border float-a absolute -right-1 bottom-0 w-[56%] sm:right-0">
        <ResumeArt accent="#4263ff" score={92} person={{ name: "Aarav Mehta", role: "Senior Product Analyst", city: "Pune" }} className="!rounded-[calc(1.25rem-1.5px)] !border-0" />
      </div>
      <div aria-hidden className="absolute top-[-4%] right-[8%] size-24 rounded-full bg-[#ffc857]" />
      <div aria-hidden className="absolute bottom-[10%] left-[-3%] size-14 rounded-full bg-[#ff8f7a]" />
      <div className={cx(card, "float-b absolute top-[8%] right-[2%] flex items-center gap-2 px-3 py-2")}>
        <BadgeCheck className="size-4 text-[#0b7a5a]" aria-hidden />
        <span className="text-xs font-bold">Every change is yours to approve</span>
      </div>
    </div>
  );
}

const SPARKS = [
  { left: "12%", top: "70%", dur: "17s", delay: "0s", dx: "30px", dy: "-140px" },
  { left: "28%", top: "82%", dur: "21s", delay: "4s", dx: "-20px", dy: "-180px" },
  { left: "46%", top: "64%", dur: "15s", delay: "8s", dx: "40px", dy: "-120px" },
  { left: "63%", top: "88%", dur: "19s", delay: "2s", dx: "-30px", dy: "-200px" },
  { left: "78%", top: "60%", dur: "23s", delay: "6s", dx: "20px", dy: "-150px" },
  { left: "90%", top: "78%", dur: "18s", delay: "10s", dx: "-40px", dy: "-130px" },
];

/** Minimal animated backdrop: drifting hairline grid, a few sparks and a slow light sweep. */
export function BgFx({ sparks = true, beam = true }: { sparks?: boolean; beam?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid" />
      {sparks && SPARKS.map((p, i) => <span key={i} className="spark" style={{ left: p.left, top: p.top, "--dur": p.dur, "--delay": p.delay, "--dx": p.dx, "--dy": p.dy } as React.CSSProperties} />)}
      {beam && <span className="beam" style={{ top: "38%" }} />}
    </div>
  );
}

/** Three glowing, self-writing documents: résumé, cover letter, ATS report. */
export function DocShowcase() {
  return (
    <div className="relative mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-3 md:gap-6">
      <div className="reveal md:mt-16 md:-rotate-2">
        <div className="glow-border float-a"><ResumeArt accent="#4263ff" score={92} person={{ name: "Kavya Iyer", role: "Senior Data Analyst", city: "Chennai" }} className="!rounded-[calc(1.25rem-1.5px)] !border-0" /></div>
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Tailored résumé</p>
      </div>
      <div className="reveal" style={{ "--delay": "120ms" } as React.CSSProperties}>
        <div className="glow-border is-warm float-b"><CoverLetterArt person={{ name: "Daniel Okafor", city: "London", email: "daniel@example.com" }} /></div>
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Matching cover letter</p>
      </div>
      <div className="reveal md:mt-24 md:rotate-2" style={{ "--delay": "240ms" } as React.CSSProperties}>
        <div className="glow-border is-cyan float-c"><AtsReportArt /></div>
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">ATS alignment report</p>
      </div>
    </div>
  );
}
