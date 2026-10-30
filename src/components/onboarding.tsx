"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ResumeData } from "@/lib/resume/schema";
import { cx } from "@/lib/format";
import { Alert, api } from "./client";
import { cleanResume, ResumeEditor } from "./resume-editor";

type Parsed = { data: ResumeData; parsedBy: string; warning?: string; text: string };

const STAGES = ["Reading file", "Extracting text", "Structuring sections", "Detecting skills"];

export function OnboardingFlow({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(init: RequestInit & { json?: unknown }) {
    setBusy(true);
    setError("");
    setStage(0);
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), aiEnabled ? 2500 : 500);
    try {
      setParsed(await api<Parsed>("/api/resume", { method: "POST", ...init }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  function upload(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError("Please upload a PDF or DOCX file.");
    if (file.size > 5 * 1024 * 1024) return setError("That file is over 5 MB.");
    const fd = new FormData();
    fd.append("file", file);
    run({ body: fd });
  }

  async function save() {
    if (!parsed) return;
    setSaving(true);
    setError("");
    try {
      await api("/api/profile", { method: "PUT", json: { data: cleanResume(parsed.data), resumeText: parsed.text, parsedBy: parsed.parsedBy } });
      router.push("/preferences?onboarding=1");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (parsed)
    return (
      <div className="mx-auto max-w-3xl">
        <Steps current={1} />
        <h1 className="font-display text-2xl font-extrabold">Review your profile</h1>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          We extracted the details below{parsed.parsedBy !== "heuristic" ? " with AI" : ""}. Correct anything that&apos;s off — this becomes your profile and powers job matching.
        </p>
        {parsed.warning && <div className="mb-5"><Alert kind="warning">{parsed.warning}</Alert></div>}
        <ResumeEditor value={parsed.data} onChange={(data) => setParsed({ ...parsed, data })} />
        {error && <div className="mt-4"><Alert>{error}</Alert></div>}
        <div className="sticky bottom-0 mt-6 flex justify-between gap-3 border-t border-slate-200 bg-slate-50/95 py-4 backdrop-blur">
          <button className="btn-secondary" onClick={() => setParsed(null)}>Start over</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & continue"}</button>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <Steps current={0} />
      <h1 className="font-display text-2xl font-extrabold">Add your resume</h1>
      <p className="mt-1 text-sm text-slate-600">Upload a PDF or DOCX, or paste the text. You&apos;ll review everything before it&apos;s saved.</p>
      <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 ring-1 ring-sky-200">💡 <b>Coming from LinkedIn?</b> Open your LinkedIn profile → <i>More</i> → <i>Save to PDF</i>, then upload that file here. We read LinkedIn&apos;s export layout — no scraping or LinkedIn login needed.</p>

      <div className="mt-6 inline-flex rounded-lg bg-slate-100 p-1">
        {(["upload", "paste"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={cx("rounded-md px-4 py-1.5 text-sm font-medium", mode === m ? "bg-white shadow-sm" : "text-slate-600")}>
            {m === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {busy ? (
          <div className="card p-8" aria-live="polite">
            <p className="font-medium">Analyzing your resume…</p>
            <ol className="mt-4 space-y-2">
              {STAGES.map((s, i) => (
                <li key={s} className={cx("flex items-center gap-2 text-sm", i <= stage ? "text-slate-900" : "text-slate-400")}>
                  <span className={cx("grid size-5 place-items-center rounded-full text-[10px]", i < stage ? "bg-emerald-500 text-white" : i === stage ? "animate-pulse bg-brand-500 text-white" : "bg-slate-200")}>
                    {i < stage ? "✓" : i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }} />
            </div>
          </div>
        ) : mode === "upload" ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files[0]);
            }}
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition",
              drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400",
            )}
          >
            <div className="text-4xl">📄</div>
            <p className="mt-3 font-semibold">Drag & drop your resume here</p>
            <p className="text-sm text-slate-500">or click to browse · PDF or DOCX · up to 5 MB</p>
            <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        ) : (
          <div className="card p-4">
            <textarea className="input min-h-72 font-mono text-xs" placeholder="Paste your full resume text here…" value={text} onChange={(e) => setText(e.target.value)} />
            <div className="mt-3 flex justify-end">
              <button className="btn-primary" disabled={text.trim().length < 80} onClick={() => run({ json: { text } })}>Analyze resume</button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <span className="text-slate-600">Just testing? Use a fictional sample resume.</span>
        <button className="btn-secondary" disabled={busy} onClick={() => run({ json: { demo: true } })}>Use demo resume</button>
      </div>
      {!aiEnabled && (
        <p className="mt-4 text-xs text-slate-500">AI parsing isn&apos;t configured on this server, so a rule-based parser will be used. You can correct everything in the next step.</p>
      )}
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const steps = ["Upload", "Review", "Preferences", "Matches"];
  return (
    <ol className="mb-8 flex items-center gap-2 text-xs font-medium">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cx("grid size-6 place-items-center rounded-full", i <= current ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600")}>{i + 1}</span>
          <span className={i <= current ? "text-slate-900" : "text-slate-500"}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300" />}
        </li>
      ))}
    </ol>
  );
}
