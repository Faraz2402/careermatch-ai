"use client";

import { useEffect } from "react";

/** Feeds the pointer position to fluid buttons and bento tiles (--mx / --my) so their glow follows it. */
export function PointerGlow() {
  useEffect(() => {
    const track = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(".btn-primary, .btn-secondary, .btn-fluid, .bento");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", track, { passive: true });
    return () => document.removeEventListener("pointermove", track);
  }, []);
  return null;
}
