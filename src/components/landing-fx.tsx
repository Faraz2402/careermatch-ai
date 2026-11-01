"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Scroll-triggered entrance animations: elements with .reveal get .is-in once
 * they scroll into view (one IntersectionObserver, disconnected on cleanup).
 * Re-scans when the route changes so client navigations reveal too.
 */
export function LandingFx() {
  const path = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.is-in)");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  return null;
}
