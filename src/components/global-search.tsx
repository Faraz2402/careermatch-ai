"use client";

import { Briefcase, Building2, Globe2, Layers, Loader2, MessageSquareText, RefreshCw, Search, Sparkles, Tag, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/format";
import { AgentReply, ModeSwitch } from "./interview-qa/chat-widget";
import { useAgent, type AgentMode } from "./interview-qa/use-agent";

type Suggest = { facets: { kind: string; value: string }[]; questions: { id: string; question: string; type: string }[] };
const KIND: Record<string, { label: string; icon: typeof Layers }> = { dept: { label: "Department", icon: Layers }, role: { label: "Role", icon: Briefcase }, tool: { label: "Tool", icon: Wrench }, skill: { label: "Skill", icon: Tag }, company: { label: "Company", icon: Building2 } };

/** AI answer overlay for the header search. */
function AiOverlay({ query, onClose }: { query: string; onClose: () => void }) {
  const [mode, setMode] = useState<AgentMode>("ai");
  const { messages, ask, regenerate } = useAgent();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    ask(query, "ai");
  }, [ask, query]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const reply = messages[messages.length - 1];
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[#0b1020]/70 p-4 pt-[8vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="AI search" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="menu-in flex max-h-[84vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl">
        <header className="bg-gradient-to-br from-[#10152b] via-[#1a2160] to-[#232b7a] px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 size-5 shrink-0 text-[#ffc857]" />
            <p className="min-w-0 flex-1 text-lg font-semibold">{query}</p>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="w-72"><ModeSwitch mode={mode} onChange={(m) => { setMode(m); regenerate(m); }} /></div>
            {reply && !reply.pending && <button onClick={() => regenerate(mode)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"><RefreshCw className="size-3.5" /> Regenerate</button>}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{reply?.role === "assistant" ? <AgentReply m={reply} /> : <Loader2 className="size-5 animate-spin text-brand-600" />}</div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          <span>{mode === "web" ? "Grounded in live Google results." : "Grounded in the CareerMatch interview bank."} Uses one AI action.</span>
          <a href={`/interview-qa?q=${encodeURIComponent(query)}`} className="font-bold text-brand-700 hover:underline">See matching questions →</a>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

/** Header search: instant index results, or an AI Engine answer. */
export function GlobalSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<"standard" | "ai">("standard");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "standard" || q.trim().length < 2) {
      setData(null);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/interview-qa/suggest?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json())
        .then((d: Suggest) => setData(d))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
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
  const submit = () => {
    const t = q.trim();
    if (!t) return;
    if (mode === "ai") {
      setOpen(false);
      setAi(t);
    } else go(`/interview-qa?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={wrap} className="relative w-full max-w-xl">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={cx("flex items-center gap-2 rounded-full border bg-surface py-1 pr-1 pl-3.5 shadow-sm transition focus-within:shadow-md", mode === "ai" ? "border-[#8457ff]/60 ring-2 ring-[#8457ff]/15" : "border-slate-200 focus-within:border-brand-400")}
        role="search"
      >
        {mode === "ai" ? <Sparkles className="size-4 shrink-0 text-[#8457ff]" /> : <Search className="size-4 shrink-0 text-slate-400" />}
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={mode === "ai" ? "Ask the AI engine anything about interviews…" : "Search roles, skills, companies, questions…"}
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          aria-label="Search"
        />
        {loading && <Loader2 className="size-4 animate-spin text-slate-400" />}
        <button type="button" role="switch" aria-checked={mode === "ai"} aria-label="AI mode" onClick={() => setMode(mode === "ai" ? "standard" : "ai")} className={cx("relative flex h-8 shrink-0 items-center rounded-full px-1 text-[11px] font-bold transition-colors", mode === "ai" ? "bg-gradient-to-r from-[#4263ff] to-[#8457ff] text-white" : "bg-slate-100 text-slate-600")}>
          <span className={cx("grid size-6 place-items-center rounded-full bg-white shadow transition-transform duration-300", mode === "ai" ? "translate-x-[4.6rem] text-[#8457ff]" : "text-slate-500")}>{mode === "ai" ? <Sparkles className="size-3.5" /> : <Search className="size-3.5" />}</span>
          <span className={cx("absolute transition-all", mode === "ai" ? "left-2.5" : "left-8")}>{mode === "ai" ? "AI Engine" : "Standard"}</span>
          <span className="w-[4.7rem]" />
        </button>
      </form>

      {open && mode === "standard" && data && (data.facets.length > 0 || data.questions.length > 0) && (
        <div className="card menu-in absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto p-2 shadow-2xl">
          {data.facets.map((f) => {
            const K = KIND[f.kind];
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
          <button onClick={() => { setOpen(false); setAi(q.trim()); }} className="mt-1 flex w-full items-center gap-2 rounded-xl bg-gradient-to-r from-[#4263ff]/10 to-[#8457ff]/10 px-2.5 py-2 text-left text-sm font-semibold text-[#4735b5] hover:from-[#4263ff]/20 hover:to-[#8457ff]/20">
            <Globe2 className="size-4" /> Ask the AI engine about “{q.trim()}”
          </button>
        </div>
      )}
      {ai && <AiOverlay query={ai} onClose={() => setAi(null)} />}
    </div>
  );
}
