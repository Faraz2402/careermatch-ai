"use client";

import { useCallback, useRef, useState } from "react";

export type AgentMode = "ai" | "web";
export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
  mode?: AgentMode;
  sources?: { title: string; url: string }[];
  related?: { id: string; question: string; type: string; company: string | null }[];
  notice?: string;
  error?: string;
  pending?: boolean;
};

/** Streams answers from /api/query-agent (NDJSON events) into a message list. */
export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (query: string, mode: AgentMode, base: AgentMessage[]) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const history = base.filter((m) => !m.error && !m.pending).map((m) => ({ role: m.role, content: m.content.slice(0, 6000) })).slice(-12);
    const reply: AgentMessage = { role: "assistant", content: "", mode, pending: true };
    setMessages([...base, { role: "user", content: query, mode }, reply]);
    setBusy(true);
    const patch = (fn: (m: AgentMessage) => AgentMessage) =>
      setMessages((all) => {
        const next = [...all];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });
    try {
      const res = await fetch("/api/query-agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, mode, history }), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        patch((m) => ({ ...m, pending: false, error: j.error ?? "Something went wrong." }));
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const e = JSON.parse(line) as { type: string; text?: string; sources?: AgentMessage["sources"]; questions?: AgentMessage["related"]; error?: string };
          if (e.type === "text") patch((m) => ({ ...m, content: m.content + (e.text ?? "") }));
          else if (e.type === "sources") patch((m) => ({ ...m, sources: e.sources }));
          else if (e.type === "related") patch((m) => ({ ...m, related: e.questions }));
          else if (e.type === "notice") patch((m) => ({ ...m, notice: e.text }));
          else if (e.type === "error") patch((m) => ({ ...m, error: e.error }));
        }
      }
      patch((m) => ({ ...m, pending: false }));
    } catch (err) {
      if ((err as Error).name !== "AbortError") patch((m) => ({ ...m, pending: false, error: "Connection lost. Try again." }));
    } finally {
      setBusy(false);
    }
  }, []);

  const ask = useCallback((query: string, mode: AgentMode) => run(query, mode, messages), [messages, run]);
  /** Re-run the last question (optionally in the other mode). */
  const regenerate = useCallback(
    (mode?: AgentMode) => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!lastUser) return;
      const cut = messages.lastIndexOf(lastUser);
      run(lastUser.content, mode ?? lastUser.mode ?? "ai", messages.slice(0, cut));
    },
    [messages, run],
  );
  const reset = useCallback(() => {
    abort.current?.abort();
    setMessages([]);
  }, []);
  return { messages, busy, ask, regenerate, reset };
}
