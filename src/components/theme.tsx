"use client";

import { useEffect, useState } from "react";

import { THEME_KEY as KEY } from "@/lib/theme-script";
type Mode = "system" | "light" | "dark";

function apply(mode: Mode) {
  const el = document.documentElement;
  if (mode === "system") delete el.dataset.theme;
  else el.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable - theme still applies for this page */
  }
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setMode(t === "light" || t === "dark" ? t : "system");
  }, []);
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="text-slate-600">Theme</span>
      <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Color theme">
        {(["light", "system", "dark"] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            title={m[0].toUpperCase() + m.slice(1)}
            onClick={() => {
              setMode(m);
              apply(m);
            }}
            className={`rounded-md px-2 py-0.5 text-xs ${mode === m ? "bg-surface shadow-sm" : "text-slate-500"}`}
          >
            {m === "light" ? "☀" : m === "dark" ? "☾" : "Auto"}
          </button>
        ))}
      </div>
    </div>
  );
}
