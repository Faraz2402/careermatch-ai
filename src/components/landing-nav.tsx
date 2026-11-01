"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "#method", label: "Method" },
  { href: "/pricing", label: "Pricing" },
];

type Pill = { left: number; width: number } | null;

/** Section links as capsules with a glass pill that glides to whichever one is hovered or focused. */
export function LandingNav({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<Pill>(null);

  const moveTo = (el: HTMLElement) => setPill({ left: el.offsetLeft, width: el.offsetWidth });

  return (
    <nav aria-label="Sections" className={className}>
      <div
        ref={wrap}
        onMouseLeave={() => setPill(null)}
        onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node) && setPill(null)}
        className="relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-violet-500/35 to-cyan-400/25 shadow-[0_0_24px_rgba(139,92,246,0.35),inset_0_0_0_1px_rgba(255,255,255,0.14)] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: pill?.left ?? 0, width: pill?.width ?? 0, opacity: pill ? 1 : 0 }}
        />
        {LINKS.map(({ href, label }) => {
          const cls =
            "relative z-10 rounded-full px-4 py-1.5 text-[15px] text-[#d4d4d8] transition-colors duration-200 hover:text-white focus-visible:text-white focus-visible:outline-none active:bg-white/10 sm:px-5";
          const events = {
            onMouseEnter: (e: React.MouseEvent<HTMLElement>) => moveTo(e.currentTarget),
            onFocus: (e: React.FocusEvent<HTMLElement>) => moveTo(e.currentTarget),
          };
          return href.startsWith("#") ? (
            <a key={href} href={href} className={cls} {...events}>{label}</a>
          ) : (
            <Link key={href} href={href} className={cls} {...events}>{label}</Link>
          );
        })}
      </div>
    </nav>
  );
}
