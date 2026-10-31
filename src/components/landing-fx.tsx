"use client";

import { useEffect, useRef, useState } from "react";

const MAGNETIC = ".btn-fluid, [data-magnet]";

/**
 * Homepage interactions: pointer-tracked glows on fluid buttons and bento
 * tiles, scroll reveals, and (on mouse devices without reduced motion) a dot
 * cursor that becomes a magnetic ring over buttons and cards.
 */
export function LandingFx() {
  const [cursor, setCursor] = useState(false);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  // Glow tracking + reveals: everywhere.
  useEffect(() => {
    const track = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(".btn-fluid, .bento");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", track, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCursor(fine && !calm);
    return () => {
      document.removeEventListener("pointermove", track);
      io.disconnect();
    };
  }, []);

  // Custom cursor.
  useEffect(() => {
    if (!cursor) return;
    const root = document.querySelector(".lux");
    root?.classList.add("lux-cursor-on");
    const p = { x: -100, y: -100 }, r = { x: -100, y: -100 };
    let target: HTMLElement | null = null;
    let frame = 0;

    const move = (e: PointerEvent) => {
      p.x = e.clientX;
      p.y = e.clientY;
      const hit = (e.target as Element | null)?.closest<HTMLElement>(MAGNETIC) ?? null;
      if (hit !== target) {
        if (target) target.style.translate = "";
        target = hit;
        ring.current?.classList.toggle("is-active", !!target);
      }
      // Magnetic pull: the target leans a little toward the pointer.
      if (target && target.matches(".btn-fluid")) {
        const b = target.getBoundingClientRect();
        target.style.translate = `${(p.x - (b.left + b.width / 2)) * 0.18}px ${(p.y - (b.top + b.height / 2)) * 0.28}px`;
      }
    };
    const down = () => ring.current?.classList.add("is-down");
    const up = () => ring.current?.classList.remove("is-down");
    const leave = () => {
      p.x = p.y = -100;
      if (target) target.style.translate = "";
      target = null;
      ring.current?.classList.remove("is-active");
    };

    const tick = () => {
      // The ring settles on the target's centre (with a little pointer pull), or trails the dot.
      let tx = p.x, ty = p.y;
      if (target && target.matches(".btn-fluid")) {
        const b = target.getBoundingClientRect();
        tx = b.left + b.width / 2 + (p.x - (b.left + b.width / 2)) * 0.35;
        ty = b.top + b.height / 2 + (p.y - (b.top + b.height / 2)) * 0.35;
      }
      r.x += (tx - r.x) * 0.18;
      r.y += (ty - r.y) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", down);
    document.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      root?.classList.remove("lux-cursor-on");
      if (target) target.style.translate = "";
    };
  }, [cursor]);

  if (!cursor) return null;
  return (
    <>
      <div ref={ring} className="lux-cursor ring" aria-hidden />
      <div ref={dot} className="lux-cursor dot" aria-hidden />
    </>
  );
}
