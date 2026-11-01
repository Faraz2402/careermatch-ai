"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DraftSummary, DraftView } from "@/lib/tailor/drafts";
import { Alert, api } from "../client";
import { StudioEditor } from "./studio-editor";

/**
 * "Tailor résumé & cover letter" on a job page. Opens the Studio in the same
 * window as a wide panel over the job (a strip of the page stays visible), with
 * Back to job description returning to the exact scroll position. Browser Back
 * closes it too.
 */
export function TailorLauncher({ jobId, canUsePro, className }: { jobId: string; canUsePro: boolean; className?: string }) {
  const [draft, setDraft] = useState<DraftView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; upgrade?: boolean } | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const close = useCallback(() => {
    setDraft(null);
    document.body.style.overflow = "";
    requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
  }, [scrollY]);

  useEffect(() => {
    if (!draft) return;
    const onPop = () => close();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [draft, close]);

  async function open() {
    setBusy(true);
    setError(null);
    setScrollY(window.scrollY);
    try {
      const { drafts } = await api<{ drafts: DraftSummary[] }>("/api/studio/drafts");
      const existing = drafts.find((d) => d.jobId === jobId);
      const d = existing ? await api<DraftView>(`/api/studio/drafts/${existing.id}`) : await api<DraftView>("/api/studio/drafts", { method: "POST", json: { jobId } });
      document.body.style.overflow = "hidden";
      history.pushState({ tailor: true }, "", "#tailor");
      setDraft(d);
    } catch (e) {
      const err = e as Error & { status?: number };
      setError({ message: err.message, upgrade: /Upgrade|Pro/.test(err.message) });
    } finally {
      setBusy(false);
    }
  }

  const back = () => {
    if (location.hash === "#tailor") history.back();
    else close();
  };

  return (
    <>
      <button onClick={open} disabled={busy} className={className ?? "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"}>
        <Sparkles className="size-4" aria-hidden /> {busy ? "Analysing the job…" : "Tailor résumé & cover letter"}
      </button>
      {error && (
        <div className="mt-2">
          <Alert kind={error.upgrade ? "warning" : "error"}>
            {error.message} {error.upgrade && <Link href="/pricing" className="font-semibold underline">See Pro</Link>}
          </Alert>
        </div>
      )}
      {draft && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Tailor résumé and cover letter">
          <button className="hidden w-[6vw] shrink-0 bg-black/45 backdrop-blur-[1px] md:block" onClick={back} aria-label="Back to job description" />
          <div className="min-w-0 flex-1 overflow-hidden shadow-2xl">
            <StudioEditor initial={draft} canUsePro={canUsePro} onBack={back} />
          </div>
        </div>
      )}
    </>
  );
}
