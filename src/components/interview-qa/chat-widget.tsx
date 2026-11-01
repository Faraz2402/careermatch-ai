"use client";

import { Bot, Globe2, MessageCircle, RefreshCw, Send, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { Markdown } from "./markdown";
import { useAgent, type AgentMessage, type AgentMode } from "./use-agent";

export function ModeSwitch({ mode, onChange, compact }: { mode: AgentMode; onChange: (m: AgentMode) => void; compact?: boolean }) {
  return (
    <div className="relative flex rounded-full bg-white/10 p-1 text-xs font-bold" role="radiogroup" aria-label="Answer mode">
      <span aria-hidden className={cx("absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-r shadow transition-all duration-300", mode === "ai" ? "left-1 from-[#4263ff] to-[#8457ff]" : "left-[calc(50%+2px)] from-[#0891b2] to-[#20c997]")} />
      {(["ai", "web"] as const).map((m) => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => onChange(m)} className={cx("relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 whitespace-nowrap transition-colors", mode === m ? "text-white" : "text-white/70 hover:text-white")}>
          {m === "ai" ? <Sparkles className="size-3.5" /> : <Globe2 className="size-3.5" />}
          {m === "ai" ? (compact ? "AI tool" : "Ask AI Tool") : compact ? "Live web" : "Search Live Web"}
        </button>
      ))}
    </div>
  );
}

export function AgentReply({ m }: { m: AgentMessage }) {
  return (
    <div>
      {m.notice && <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">{m.notice}</p>}
      {m.content ? <Markdown text={m.content} /> : m.pending ? <span className="iq-typing text-brand-500" aria-label="Thinking"><span /><span /><span /></span> : null}
      {m.error && <p className="mt-1 text-sm font-medium text-rose-600">{m.error}</p>}
      {m.sources && m.sources.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">Sources</p>
          <ol className="mt-1 space-y-1 text-xs">
            {m.sources.map((s, i) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{i + 1}. {s.title || new URL(s.url).hostname}</a></li>
            ))}
          </ol>
        </div>
      )}
      {m.related && m.related.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">From the question bank</p>
          <ul className="mt-1 space-y-1 text-xs">
            {m.related.map((r, i) => (
              <li key={r.id}><a href={`/interview-qa?q=${encodeURIComponent(r.question.slice(0, 80))}`} className="text-slate-700 hover:text-brand-700 hover:underline">[{i + 1}] {r.question}{r.company ? ` · ${r.company}` : ""}</a></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const STARTERS = ["How do I answer 'Tell me about a conflict with a co-worker'?", "Explain SQL window functions with an example", "What do Amazon behavioral interviews focus on?", "Common Power BI DAX interview questions"];

/** Floating interview-coach chat for /interview-qa. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AgentMode>("ai");
  const [input, setInput] = useState("");
  const { messages, busy, ask, regenerate, reset } = useAgent();
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages]);
  const send = (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    setInput("");
    ask(t, mode);
  };

  return (
    <>
      <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Close interview coach" : "Open interview coach"} className="fixed right-5 bottom-5 z-50 grid size-14 place-items-center rounded-full bg-gradient-to-br from-[#4263ff] via-[#8457ff] to-[#19c6e8] text-white shadow-[0_12px_32px_-8px_rgba(66,99,255,0.8)] transition hover:scale-105">
        {!open && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-[#8457ff]/40" />}
        {open ? <X className="relative size-6" /> : <MessageCircle className="relative size-6" />}
      </button>
      {open && (
        <section className="menu-in fixed right-5 bottom-24 z-50 flex h-[min(38rem,calc(100vh-8rem))] w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-surface shadow-2xl" aria-label="Interview coach">
          <header className="bg-gradient-to-br from-[#10152b] via-[#1a2160] to-[#232b7a] px-4 pt-4 pb-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-white/15"><Bot className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">Interview coach</p>
                <p className="text-xs text-white/70">{mode === "ai" ? "Answers from our question bank" : "Live Google search with sources"}</p>
              </div>
              {messages.length > 0 && <button onClick={reset} className="grid size-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Clear chat"><Trash2 className="size-4" /></button>}
            </div>
            <div className="mt-3"><ModeSwitch mode={mode} onChange={setMode} /></div>
          </header>
          <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Ask anything about interviews: a question you were asked, a concept to explain, or how a company interviews.</p>
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-gradient-to-br from-[#4263ff] to-[#8457ff] px-3.5 py-2 text-sm text-white">{m.content}</div>
              ) : (
                <div key={i} className="mr-4 rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5">
                  <AgentReply m={m} />
                  {!m.pending && i === messages.length - 1 && (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => regenerate()} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"><RefreshCw className="size-3.5" /> Regenerate</button>
                      <button onClick={() => regenerate(m.mode === "web" ? "ai" : "web")} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white">{m.mode === "web" ? <Sparkles className="size-3.5" /> : <Globe2 className="size-3.5" />} Try {m.mode === "web" ? "AI tool" : "live web"}</button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-slate-200 p-3">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} rows={1} placeholder={mode === "ai" ? "Ask the interview coach…" : "Search the live web…"} className="input max-h-28 min-h-10 resize-none text-sm" aria-label="Message" />
            <button disabled={busy || !input.trim()} className="btn-primary !size-10 !p-0" aria-label="Send"><Send className="size-4" /></button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-slate-400">Each answer uses one AI action. AI can be wrong; check important details.</p>
        </section>
      )}
    </>
  );
}
