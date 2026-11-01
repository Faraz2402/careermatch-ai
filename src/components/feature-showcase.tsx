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
  { icon: Search, emoji: "🛰️", title: "Jobs from 18 official sources", body: "Employer career sites, job boards and 9 remote boards — deduplicated, fresh, never scraped behind logins.", tag: "Free", tone: "from-sky-400/30 to-cyan-300/10" },
  { icon: BarChart3, emoji: "🎯", title: "Match score that shows its working", body: "Skills, role, seniority, location, pay and freshness — each weighed and explained.", tag: "Free", tone: "from-emerald-400/30 to-teal-300/10" },
  { icon: Tags, emoji: "🧩", title: "Keyword gap with evidence", body: "Every requirement marked exact, equivalent, partial or missing — quoting your own résumé line.", tag: "Studio", tone: "from-violet-400/30 to-fuchsia-300/10" },
  { icon: PenLine, emoji: "✍️", title: "Every bullet rewritten for the job", body: "Reasons for each change; accept, edit or reject. Invented numbers and tools are blocked.", tag: "Studio", tone: "from-fuchsia-400/30 to-pink-300/10" },
  { icon: FileText, emoji: "💌", title: "Matching cover letter", body: "Same job, your real evidence, three tones, two lengths. Word or PDF.", tag: "Studio", tone: "from-rose-400/30 to-orange-300/10" },
  { icon: Globe2, emoji: "🌏", title: `${TEMPLATES.length} templates, 40+ countries`, body: "Indian corporate, Lebenslauf, Rirekisho, Europass, Gulf, US federal… ATS-first and visual.", tag: "Free + Pro", tone: "from-amber-400/30 to-yellow-300/10" },
  { icon: Link2, emoji: "🔗", title: "Straight to the employer", body: "We find the original posting and link you there, plus LinkedIn and Naukri.", tag: "Free", tone: "from-cyan-400/30 to-sky-300/10" },
  { icon: Wallet, emoji: "💰", title: "Market pay in ₹", body: "Public salary figures for the same title and city, each with its source.", tag: "Free", tone: "from-lime-400/30 to-emerald-300/10" },
  { icon: Kanban, emoji: "🗂️", title: "Application tracker", body: "Saved → applied → interviewing → offer, with notes and follow-up reminders.", tag: "Free", tone: "from-indigo-400/30 to-violet-300/10" },
  { icon: Mic, emoji: "🎤", title: "Mock interview", body: "Questions from the actual role, feedback after every answer.", tag: "AI", tone: "from-pink-400/30 to-rose-300/10" },
  { icon: Bell, emoji: "☀️", title: "7 AM job email", body: "Your best new matches every morning, scored and explained.", tag: "Pro", tone: "from-orange-400/30 to-amber-300/10" },
  { icon: UserRound, emoji: "🪪", title: "Public profile page", body: "One link for recruiters, with privacy controls for every section.", tag: "Free", tone: "from-teal-400/30 to-cyan-300/10" },
];

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
    <section id="features" className="scroll-mt-24 border-t border-[#27272a]">
      <div className="mx-auto max-w-7xl px-4 py-28 sm:px-8 lg:py-36">
        <div className="max-w-3xl">
          <p className="text-sm font-medium tracking-[0.2em] text-[#a1a1aa] uppercase">Everything inside</p>
          <h2 className="reveal lux-serif mt-4 text-4xl leading-[1.05] sm:text-6xl">
            One tab for the whole job hunt.
            <br />
            <span className="lux-sheen italic">Go on, poke it.</span>
          </h2>
        </div>

        {/* Interactive tailoring demo */}
        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-indigo-600/10 to-cyan-500/20 p-6 sm:p-8 lg:col-span-7">
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold"><Sparkles className="size-4 text-amber-300" aria-hidden /> Make Resume &amp; Cover Letter</p>
              <div className="flex rounded-full bg-black/40 p-1 text-sm font-semibold" role="tablist" aria-label="Tailoring demo">
                <button role="tab" aria-selected={!after} onClick={() => toggle(false)} className={`rounded-full px-4 py-1.5 transition ${!after ? "bg-white text-black" : "text-white/70 hover:text-white"}`}>Before</button>
                <button role="tab" aria-selected={after} onClick={() => toggle(true)} className={`rounded-full px-4 py-1.5 transition ${after ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white" : "text-white/70 hover:text-white"}`}>After ✨</button>
              </div>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_170px]">
              <div>
                <p className="text-xs tracking-wide text-white/60 uppercase">Your bullet</p>
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
                <p className="lux-serif mt-1 text-6xl tabular-nums"><Counter to={after ? 82 : 64} /></p>
                <p className={`mt-2 rounded-full px-3 py-0.5 text-sm font-bold transition ${after ? "bg-emerald-400 text-emerald-950" : "bg-white/10 text-white/70"}`}>{after ? "+18 points" : "before"}</p>
                <p className="mt-3 text-[11px] leading-snug text-white/45">An estimate, not an employer&apos;s ATS score.</p>
              </div>
            </div>
          </article>

          {/* Template strip */}
          <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 lg:col-span-5">
            <p className="text-sm font-semibold text-white/80">Templates for India &amp; the world</p>
            <p className="mt-1 text-sm text-white/55">Free ones to start, Pro ones when you&apos;re hooked. Every badge says which is which.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {STRIP.map((t, i) => (
                <div key={t.id} className="group relative rounded-xl bg-white/5 p-1.5 transition duration-300 hover:-translate-y-2 hover:rotate-[-1.5deg] hover:bg-white/10" style={{ transitionDelay: `${i * 20}ms` }}>
                  <TemplateCanvas doc={buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL)} scale={0.14} crop guides={false} className="mx-auto rounded shadow-lg" />
                  <span className="absolute top-2 left-2"><TierBadge tier={t.tier} /></span>
                  <p className="mt-1 truncate text-center text-[11px] text-white/70">{t.market}</p>
                </div>
              ))}
            </div>
            <Link href="/signup" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline"><Crown className="size-4 text-amber-300" aria-hidden /> See all {TEMPLATES.length} templates →</Link>
          </article>
        </div>

        {/* Feature board */}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="reveal group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1.5 hover:border-white/25" style={{ "--delay": `${(i % 4) * 70}ms` } as React.CSSProperties}>
              <div aria-hidden className={`absolute inset-0 bg-gradient-to-br ${f.tone} opacity-0 transition duration-500 group-hover:opacity-100`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-3xl transition duration-300 group-hover:scale-125 group-hover:-rotate-12" aria-hidden>{f.emoji}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.tag === "Pro" ? "bg-amber-400 text-black" : f.tag === "Studio" ? "bg-violet-400/25 text-violet-100" : "bg-white/10 text-white/80"}`}>{f.tag}</span>
                </div>
                <h3 className="mt-4 flex items-center gap-2 text-lg font-semibold text-white"><f.icon className="size-4 text-white/60" aria-hidden />{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#d4d4d8]">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-r from-violet-600/20 via-transparent to-cyan-500/20 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="lux-serif text-3xl">Your first tailored résumé and cover letter are free.</p>
            <p className="mt-1 text-[#d4d4d8]">Try it on a real job. If it lands you an interview, Pro does it for every job you apply to.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/signup" className="btn-fluid">Start free <span className="arrow">→</span></Link>
            <Link href="/pricing" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><ShieldCheck className="mr-1 inline size-4" aria-hidden />See Pro</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

