"use client";

// Homepage "everything CareerMatch does" showcase: a playful, interactive
// before/after tailoring demo, a live template strip and a feature board.

import { BarChart3, Bell, Crown, FileText, Globe2, Kanban, Link2, Mic, PenLine, Search, ShieldCheck, Sparkles, Tags, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TEMPLATES } from "@/lib/templates/catalog";
import { buildDoc, SAMPLE_PERSONAL, SAMPLE_RESUME } from "@/lib/templates/model";
import { TemplateCanvas } from "./studio/template-canvas";
import { TierBadge } from "./studio/template-gallery";

// [keyword, the sample person really has it]. Before tailoring only the exact matches are green;
// after, the ones they have but worded differently join them. Coupa stays red.
const KEYWORDS: [string, boolean][] = [["Procure-to-Pay (P2P)", true], ["Spend analysis", true], ["Power BI", true], ["Stakeholder management", true], ["SAP Ariba", true], ["Coupa", false]];

const BEFORE = "Responsible for P2P exception reviews with finance, cutting invoice holds by 31%";
const AFTER = "Owned Procure-to-Pay (P2P) exception reviews with finance, cutting invoice holds by 31%";

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    const from = n;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 650);
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return <>{n}</>;
}

const FEATURES = [
  { icon: Search, title: "Jobs from 18 official sources", body: "Employer career sites, job boards and 9 remote boards — deduplicated, fresh, never scraped behind logins.", tag: "Free" },
  { icon: BarChart3, title: "Match score that shows its working", body: "Skills, role, seniority, location, pay and freshness — each weighed and explained.", tag: "Free" },
  { icon: Tags, title: "Keyword gap with evidence", body: "Every requirement marked exact, equivalent, partial or missing — quoting your own résumé line.", tag: "Studio" },
  { icon: PenLine, title: "Every bullet rewritten for the job", body: "Reasons for each change; accept, edit or reject. Invented numbers and tools are blocked.", tag: "Studio" },
  { icon: FileText, title: "Matching cover letter", body: "Same job, your real evidence, three tones, two lengths. Word or PDF.", tag: "Studio" },
  { icon: Globe2, title: `${TEMPLATES.length} templates, 40+ countries`, body: "Indian corporate, Lebenslauf, Rirekisho, Europass, Gulf, US federal… ATS-first and visual.", tag: "Free + Pro" },
  { icon: Link2, title: "Straight to the employer", body: "We find the original posting and link you there, plus LinkedIn and Naukri.", tag: "Free" },
  { icon: Wallet, title: "Market pay in ₹", body: "Public salary figures for the same title and city, each with its source.", tag: "Free" },
  { icon: Kanban, title: "Application tracker", body: "Saved → applied → interviewing → offer, with notes and follow-up reminders.", tag: "Free" },
  { icon: Mic, title: "Mock interview", body: "Questions from the actual role, feedback after every answer.", tag: "AI" },
  { icon: Bell, title: "7 AM job email", body: "Your best new matches every morning, scored and explained.", tag: "Pro" },
  { icon: UserRound, title: "Public profile page", body: "One link for recruiters, with privacy controls for every section.", tag: "Free" },
];

const TONES = ["#4263ff", "#8457ff", "#19c6e8", "#20c997", "#ff716b", "#e0a100"];

const STRIP = ["in-corporate-ats", "global-sidebar", "de-lebenslauf", "us-corporate", "global-executive", "jp-rirekisho"].map((id) => TEMPLATES.find((t) => t.id === id)!);

export function FeatureShowcase() {
  const [after, setAfter] = useState(false);
  // Gently flips between before and after until the visitor takes over.
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAfter((a) => !a), 3200);
    return () => clearInterval(t);
  }, [auto]);
  const toggle = (v: boolean) => {
    setAuto(false);
    setAfter(v);
  };

  return (
    <section id="features" className="scroll-mt-24 border-y border-slate-200 bg-surface/70">
      <div className="shell py-24 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-sm font-bold tracking-[0.14em] text-brand-700 uppercase">Everything inside</p>
          <h2 className="reveal mt-4 font-serif text-[clamp(2.69rem,5.28vw,5.15rem)] leading-[1.03] font-normal tracking-[-0.015em] text-slate-900">
            One tab for the whole job hunt.
            <br />
            <span className="text-brand-600">Go on, try it.</span>
          </h2>
        </div>

        {/* Interactive tailoring demo */}
        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <article className="band-navy relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:col-span-7">
                        <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold"><Sparkles className="size-4 text-amber-300" aria-hidden /> Make Resume &amp; Cover Letter</p>
              <div className="flex rounded-full bg-black/40 p-1 text-sm font-semibold" role="tablist" aria-label="Tailoring demo">
                <button role="tab" aria-selected={!after} onClick={() => toggle(false)} className={`rounded-full px-4 py-1.5 transition ${!after ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>Before</button>
                <button role="tab" aria-selected={after} onClick={() => toggle(true)} className={`rounded-full px-4 py-1.5 transition ${after ? "bg-gradient-to-r from-[#8457ff] to-[#19c6e8] text-white" : "text-white/70 hover:text-white"}`}>After</button>
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_170px]">
              <div>
                <p className="text-xs tracking-wide text-[#c3cbea] uppercase">Your bullet</p>
                <p className={`mt-2 rounded-2xl p-4 text-lg leading-snug transition-all duration-500 ${after ? "bg-emerald-400/15 text-white" : "bg-white/5 text-white/80"}`}>
                  {after ? AFTER : BEFORE}
                </p>
                <p className="mt-2 text-sm text-white/60">{after ? "Why: a stronger verb and the posting's exact term. Your 31% stays exactly as you wrote it — we never add figures." : "Your original, kept safe. Nothing changes until you accept."}</p>
                <p className="mt-5 text-xs tracking-wide text-white/60 uppercase">Job keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {KEYWORDS.map(([k, have], i) => {
                    const green = after ? have : have && i < 3;
                    return (
                      <span key={k} className={`rounded-full px-3 py-1 text-sm font-medium transition-all duration-500 ${green ? "scale-105 bg-emerald-400/20 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`} style={{ transitionDelay: `${i * 70}ms` }}>
                        {green ? "✓" : "✗"} {k}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-white/50">Coupa stays red: you don&apos;t have it, so we don&apos;t claim it.</p>
              </div>
              <div className="flex flex-col items-center justify-center rounded-2xl bg-black/30 p-4 text-center">
                <p className="text-xs text-white/60">Estimated ATS alignment</p>
                <p className="mt-1 font-serif text-7xl tabular-nums"><Counter to={after ? 82 : 64} /></p>
                <p className={`mt-2 rounded-full px-3 py-0.5 text-sm font-bold transition ${after ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white/70"}`}>{after ? "+18 points" : "before"}</p>
                <p className="mt-3 text-[11px] leading-snug text-white/45">An estimate, not an employer&apos;s ATS score.</p>
              </div>
            </div>
          </article>

          {/* Template strip */}
          <article className="card relative overflow-hidden p-6 sm:p-8 lg:col-span-5">
            <p className="text-base font-extrabold text-slate-900">Templates for India &amp; the world</p>
            <p className="mt-1 text-sm text-slate-500">Free ones to start, Pro ones when you&apos;re hooked. Every badge says which is which.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {STRIP.map((t, i) => (
                <div key={t.id} className="group relative rounded-xl bg-slate-50 p-1.5 transition duration-300 hover:-translate-y-2 hover:rotate-[-1.5deg] hover:bg-brand-50" style={{ transitionDelay: `${i * 20}ms` }}>
                  <TemplateCanvas doc={buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL)} scale={0.14} crop guides={false} className="mx-auto rounded shadow-lg" />
                  <span className="absolute top-2 left-2"><TierBadge tier={t.tier} /></span>
                  <p className="mt-1 truncate text-center text-[11px] text-slate-600">{t.market}</p>
                </div>
              ))}
            </div>
            <Link href="/signup" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:underline"><Crown className="size-4 text-[#d99a00]" aria-hidden /> See all {TEMPLATES.length} templates →</Link>
          </article>
        </div>

        {/* Feature board */}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="reveal card card-hover p-5" style={{ "--delay": `${(i % 4) * 70}ms` } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${TONES[i % TONES.length]}, ${TONES[(i + 1) % TONES.length]})` }}><f.icon className="size-5" aria-hidden /></span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${f.tag === "Pro" ? "bg-[#ffc857] text-[#4a3000]" : f.tag === "Studio" ? "bg-[#e9e4ff] text-[#4735b5]" : f.tag === "AI" ? "bg-[#d9f4fb] text-[#0a6a80]" : "bg-slate-100 text-slate-600"}`}>{f.tag}</span>
              </div>
              <h3 className="mt-4 text-lg leading-snug font-extrabold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="card mt-12 flex flex-col items-center gap-4 bg-gradient-to-r from-brand-50 via-surface to-[#e9e4ff] p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-3xl text-slate-900">Your first tailored résumé and cover letter are free.</p>
            <p className="mt-1 text-slate-600">Try it on a real job. If it lands you an interview, Pro does it for every job you apply to.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/signup" className="btn-primary !px-6 !py-3">Start free</Link>
            <Link href="/pricing" className="btn-secondary !px-6 !py-3"><ShieldCheck className="size-4" aria-hidden />See Pro</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

