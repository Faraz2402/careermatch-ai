"use client";

import Image from "next/image";
import { useState } from "react";

export type Slide = { label: string; title: string; body: string; photo: string; alt: string; position?: string };

/**
 * Auto-advancing panels with a progress bar per slide (each bar fills over
 * its slide's time, then the next slide shows). Hovering pauses; clicking a
 * bar jumps to it.
 */
export function HomeSlider({ slides, seconds = 7 }: { slides: Slide[]; seconds?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const s = slides[i];
  return (
    <div className={paused ? "progress-paused" : undefined} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="grid items-stretch overflow-hidden rounded-3xl bg-peri lg:grid-cols-2">
        <div key={`t-${i}`} className="fade-in flex flex-col justify-center gap-5 p-8 sm:p-12 lg:p-16">
          <p className="text-sm font-semibold text-forest">{s.label}</p>
          <h3 className="serif-display text-[clamp(2rem,3.4vw,3.2rem)] leading-[1.05] text-forest-deep">{s.title}</h3>
          <p className="max-w-lg text-lg leading-8 text-forest/80">{s.body}</p>
        </div>
        <div key={`p-${i}`} className="fade-in relative min-h-72 lg:min-h-[30rem]">
          <Image src={s.photo} alt={s.alt} fill quality={90} sizes="(min-width: 1024px) 75vw, 150vw" className="photo-settle object-cover" style={{ objectPosition: s.position ?? "50% 30%" }} />
        </div>
      </div>
      <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${slides.length}, minmax(0, 1fr))` }} role="tablist" aria-label="How it works">
        {slides.map((x, k) => (
          <button key={x.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)} className="group text-left">
            <span className="block h-[3px] overflow-hidden rounded-full bg-forest/15">
              {k < i && <span className="block h-full bg-forest" />}
              {k === i && (
                <span
                  key={`f-${i}`}
                  className="progress-fill block h-full bg-forest"
                  style={{ "--dur": `${seconds}s` } as React.CSSProperties}
                  onAnimationEnd={() => setI((i + 1) % slides.length)}
                />
              )}
            </span>
            <span className={`mt-3 block text-sm font-semibold transition-colors ${k === i ? "text-forest-deep" : "text-forest/50 group-hover:text-forest"}`}>{x.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
