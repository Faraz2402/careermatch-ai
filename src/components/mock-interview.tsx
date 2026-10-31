"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { Alert, streamNdjson } from "./client";

type Msg = { role: "user" | "assistant"; content: string };

/** Renders **bold** segments; everything else is plain text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <b key={i}>{part.slice(2, -2)}</b> : <span key={i}>{part}</span>))}
    </>
  );
}

export function MockInterview({ jobId, aiEnabled, versions }: { jobId: string; aiEnabled: boolean; versions: { id: string | null; name: string }[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [versionId, setVersionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const done = messages.some((m) => m.role === "assistant" && /interview complete/i.test(m.content));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function turn(history: Msg[]) {
    setBusy(true);
    setError("");
    setMessages([...history, { role: "assistant", content: "" }]);
    try {
      await streamNdjson("/api/interview", { jobId, resumeVersionId: versionId, messages: history }, (e) => {
        if (e.type === "text") setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: m[m.length - 1].content + String(e.text) }]);
        if (e.type === "reset") setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "" }]);
        if (e.type === "notice") setNotice(String(e.text));
        if (e.type === "error") throw new Error(String(e.error));
      });
    } catch (e) {
      setError((e as Error).message);
      setMessages(history);
    } finally {
      setBusy(false);
    }
  }

  if (!started)
    return (
      <div className="card mt-6 space-y-4 p-6">
        <p className="text-sm text-slate-700">
          You&apos;ll get 5 questions tailored to this job. After each answer you get quick feedback — a strength and one thing to improve.
          {aiEnabled ? " The interviewer is powered by AI." : " AI isn't configured, so you'll get a curated question bank with rule-based feedback."}
        </p>
        <label className="flex items-center gap-2 text-sm">Answer as
          <select className="input w-auto" value={versionId ?? ""} onChange={(e) => setVersionId(e.target.value || null)}>
            {versions.map((v) => <option key={v.id ?? "p"} value={v.id ?? ""}>{v.name}</option>)}
          </select>
        </label>
        <button className="btn-primary" onClick={() => { setStarted(true); turn([]); }}>Start interview</button>
      </div>
    );

  return (
    <div className="mt-6">
      {notice && <div className="mb-3"><Alert kind="warning">{notice}</Alert></div>}
      <div className="card space-y-4 p-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line", m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800")}>
              {m.content ? <Rich text={m.content} /> : <span className="inline-flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-slate-400" /><span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" /><span className="size-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" /></span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      {done ? (
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => { setMessages([]); turn([]); }}>Practise again</button>
        </div>
      ) : (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || busy) return;
            const history: Msg[] = [...messages, { role: "user", content: draft.trim() }];
            setDraft("");
            turn(history);
          }}
        >
          <textarea
            className="input min-h-20 flex-1"
            placeholder="Type your answer… (Ctrl+Enter to send)"
            value={draft}
            aria-label="Your answer"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.ctrlKey || e.metaKey) && e.currentTarget.form?.requestSubmit()}
          />
          <button className="btn-primary self-end" disabled={busy || !draft.trim()}>Send</button>
        </form>
      )}
    </div>
  );
}
