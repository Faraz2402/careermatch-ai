"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cx } from "@/lib/format";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };
const Ctx = createContext<(text: string, kind?: Toast["kind"]) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1",
              t.kind === "error" ? "bg-rose-600 text-white ring-rose-700" : t.kind === "info" ? "bg-[#0f172a] text-white ring-[#1e293b]" : "bg-emerald-600 text-white ring-emerald-700",
            )}
          >
            <span aria-hidden>{t.kind === "error" ? "⚠" : t.kind === "info" ? "ℹ" : "✓"}</span>
            {t.text}
            <button className="ml-2 opacity-70 hover:opacity-100" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
