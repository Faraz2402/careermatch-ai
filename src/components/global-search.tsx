"use client";

import { Briefcase, Building2, ExternalLink, Layers, Loader2, MessageSquareText, Search, Sparkles, Tag, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/format";
import { googleAiUrl, googleUrl } from "@/lib/google";

type Suggest = { facets: { kind: string; value: string }[]; questions: { id: string; question: string; type: string }[] };
const KIND: Record<string, { label: string; icon: typeof Layers }> = { dept: { label: "Department", icon: Layers }, role: { label: "Role", icon: Briefcase }, tool: { label: "Tool", icon: Wrench }, skill: { label: "Skill", icon: Tag }, company: { label: "Company", icon: Building2 } };

/** Google Programmable Search Engine ID (public, not a secret). Without it, Google mode opens Google AI Mode in a new tab. */
const CSE_ID = process.env.NEXT_PUBLIC_GOOGLE_CSE_ID ?? "";


const isSuggest = (d: unknown): d is Suggest => !!d && Array.isArray((d as Suggest).facets) && Array.isArray((d as Suggest).questions);

type CseElement = { execute: (q: string) => void };
type GoogleCse = { search?: { cse?: { element?: { render: (o: Record<string, unknown>) => void; getElement: (name: string) => CseElement | undefined } } } };
declare global {
  interface Window {
    google?: GoogleCse;
    __gcse?: { parsetags?: string; initializationCallback?: () => void };
  }
}

let cseLoading: Promise<void> | null = null;
/** Loads Google's search element script once (explicit rendering). */
function loadCse() {
  if (window.google?.search?.cse?.element) return Promise.resolve();
  cseLoading ??= new Promise<void>((resolve, reject) => {
    window.__gcse = { parsetags: "explicit", initializationCallback: () => resolve() };
    const s = document.createElement("script");
    s.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(CSE_ID)}`;
    s.async = true;
    s.onerror = () => {
      cseLoading = null;
      reject(new Error("Google search couldn't load."));
    };
    document.head.appendChild(s);
  });
  return cseLoading;
}

/** Embedded Google results for the query, with a one-click hand-off to Google AI Mode. */
function GoogleOverlay({ query, onClose }: { query: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    let live = true;
    loadCse()
      .then(() => {
        const el = window.google?.search?.cse?.element;
        if (!live || !el || !box.current) return;
        box.current.innerHTML = "";
        el.render({ div: box.current, tag: "searchresults-only", gname: "cm-header", attributes: { linkTarget: "_blank", enableHistory: false } });
        el.getElement("cm-header")?.execute(query);
        setState("ready");
      })
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [query]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#0b1020]/70 p-4 pt-[6vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Google search" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="menu-in flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl">
        <header className="bg-gradient-to-br from-[#10152b] via-[#1a2160] to-[#232b7a] px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <Search className="mt-1 size-5 shrink-0 text-[#ffc857]" />
            <p className="min-w-0 flex-1 text-lg font-semibold">{query}</p>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={googleAiUrl(query)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#10152b] transition hover:-translate-y-0.5"><Sparkles className="size-3.5 text-[#8457ff]" /> Ask Google AI Mode <ExternalLink className="size-3" /></a>
            <a href={googleUrl(query)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold transition hover:bg-white/10">Open on Google <ExternalLink className="size-3" /></a>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 text-[#10152b]">
          {state === "loading" && <Loader2 className="size-5 animate-spin text-brand-600" />}
          {state === "failed" && <p className="text-sm text-slate-600">Google results couldn&apos;t load here (an ad or privacy blocker may be stopping them). Use the buttons above to search on Google directly.</p>}
          <div ref={box} />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <span>Results and AI Mode come from Google. They don&apos;t use your CareerMatch AI actions.</span>
          <a href={`/interview-qa?q=${encodeURIComponent(query)}`} className="font-bold text-brand-700 hover:underline">See matching questions →</a>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Header search: instant index results, or Google (embedded results + Google AI Mode). */
export function GlobalSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<"standard" | "google">("standard");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [google, setGoogle] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (mode !== "standard" || term.length < 2) {
      setData(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/interview-qa/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then(async (r) => {
          const d: unknown = r.ok ? await r.json() : null;
          setData(isSuggest(d) ? d : null);
        })
        .catch((e: Error) => {
          if (e.name !== "AbortError") setData(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, mode]);
  useEffect(() => {
    const close = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const askGoogle = (t: string) => {
    setOpen(false);
    if (CSE_ID) setGoogle(t);
    else window.open(googleAiUrl(t), "_blank", "noopener,noreferrer");
  };
  const submit = () => {
    const t = q.trim();
    if (!t) return;
    if (mode === "google") askGoogle(t);
    else go(`/interview-qa?q=${encodeURIComponent(t)}`);
  };
  const g = mode === "google";

  return (
    <div ref={wrap} className="relative w-full max-w-xl">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={cx("flex items-center gap-2 rounded-full border bg-surface py-1 pr-1 pl-3.5 shadow-sm transition focus-within:shadow-md", g ? "border-[#8457ff]/60 ring-2 ring-[#8457ff]/15" : "border-slate-200 focus-within:border-brand-400")}
        role="search"
      >
        {g ? <Sparkles className="size-4 shrink-0 text-[#8457ff]" /> : <Search className="size-4 shrink-0 text-slate-400" />}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={g ? "Search Google or ask Google AI Mode…" : "Search roles, skills, companies, questions…"}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          aria-label="Search"
        />
        {loading && <Loader2 className="size-4 animate-spin text-slate-400" />}
        <button type="button" role="switch" aria-checked={g} aria-label="Google mode" title={g ? "Google mode: uses Google, not your AI actions" : "Standard: search CareerMatch"} onClick={() => setMode(g ? "standard" : "google")} className={cx("relative flex h-8 shrink-0 items-center rounded-full px-1 text-[11px] font-bold transition-colors", g ? "bg-gradient-to-r from-[#4263ff] to-[#8457ff] text-white" : "bg-slate-100 text-slate-600")}>
          <span className={cx("grid size-6 place-items-center rounded-full bg-white shadow transition-transform duration-300", g ? "translate-x-[4.6rem] text-[#8457ff]" : "text-slate-500")}>{g ? <Sparkles className="size-3.5" /> : <Search className="size-3.5" />}</span>
          <span className={cx("absolute transition-all", g ? "left-2.5" : "left-8")}>{g ? "Google AI" : "Standard"}</span>
          <span className="w-[4.7rem]" />
        </button>
      </form>

      {open && !g && data && (data.facets.length > 0 || data.questions.length > 0) && (
        <div className="card menu-in absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto p-2 shadow-2xl">
          {data.facets.map((f) => {
            const K = KIND[f.kind];
            if (!K) return null;
            return (
              <button key={`${f.kind}:${f.value}`} onClick={() => go(`/interview-qa?${f.kind}=${encodeURIComponent(f.value)}`)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-brand-50">
                <K.icon className="size-4 text-brand-600" />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{f.value}</span>
                <span className="text-[11px] text-slate-500">{K.label}</span>
              </button>
            );
          })}
          {data.questions.length > 0 && <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">Questions</p>}
          {data.questions.map((x) => (
            <button key={x.id} onClick={() => go(`/interview-qa?q=${encodeURIComponent(x.question.slice(0, 80))}`)} className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-brand-50">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-[#8457ff]" />
              <span className="min-w-0 flex-1 text-slate-700">{x.question}</span>
              <span className="shrink-0 text-[11px] text-slate-500">{x.type}</span>
            </button>
          ))}
          <button onClick={() => askGoogle(q.trim())} className="mt-1 flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-[#4263ff]/10 to-[#8457ff]/10 px-2.5 py-2 text-left text-sm font-semibold text-[#4735b5] hover:from-[#4263ff]/20 hover:to-[#8457ff]/20">
            <Sparkles className="size-4" /> Ask Google AI Mode about “{q.trim()}”
          </button>
        </div>
      )}
      {google && <GoogleOverlay query={google} onClose={() => setGoogle(null)} />}
    </div>
  );
}
