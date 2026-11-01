"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/format";
import { THEME_KEY as KEY } from "@/lib/theme-script";

type Mode = "light" | "dark";

function apply(mode: Mode) {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable - theme still applies for this page */
  }
}

/** What the page is showing now: an explicit choice, or the OS preference when none is set. */
function current(): Mode {
  const t = document.documentElement.dataset.theme;
  if (t === "light" || t === "dark") return t;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const Sun = () => (
  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

/** Pill-shaped light/dark switch with a glowing, slowly rotating rim. */
export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  useEffect(() => setMode(current()), []);
  const dark = mode === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = dark ? "light" : "dark";
        setMode(next);
        apply(next);
      }}
      className={cx("theme-pill", className)}
    >
      <span className="theme-pill-track">
        <span className="theme-pill-icon left"><Sun /></span>
        <span className="theme-pill-icon right"><Moon /></span>
        <span className="theme-pill-knob">
          <span className="sun"><Sun /></span>
          <span className="moon"><Moon /></span>
        </span>
      </span>
    </button>
  );
}
