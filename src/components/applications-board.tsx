"use client";

import Link from "next/link";
import { useState } from "react";
import { cx, relativeDate, STATUS_LABELS } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";
import { EmptyState } from "./ui";

export type BoardCard = {
  jobId: string;
  title: string;
  company: string;
  status: string;
  appliedAt: string | null;
  followUpAt: string | null;
  contactName: string;
  contactEmail: string;
  resumeName: string;
};

const COLUMNS = ["interested", "applied", "interviewing", "offer", "rejected"] as const;
const COLUMN_STYLE: Record<string, string> = {
  interested: "border-t-sky-400",
  applied: "border-t-brand-500",
  interviewing: "border-t-amber-400",
  offer: "border-t-emerald-500",
  rejected: "border-t-slate-300",
};

export function ApplicationsBoard({ initial }: { initial: BoardCard[] }) {
  const toast = useToast();
  const [cards, setCards] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  async function move(jobId: string, status: string) {
    const prev = cards;
    const card = cards.find((c) => c.jobId === jobId);
    if (!card || card.status === status) return;
    const appliedAt = status === "applied" && !card.appliedAt ? new Date().toISOString() : card.appliedAt;
    setCards((cs) => cs.map((c) => (c.jobId === jobId ? { ...c, status, appliedAt } : c)));
    try {
      await api(`/api/jobs/${encodeURIComponent(jobId)}/state`, { method: "POST", json: { status } });
      toast(`Moved to ${STATUS_LABELS[status]}`);
    } catch (e) {
      setCards(prev);
      toast((e as Error).message, "error");
    }
  }

  if (cards.length === 0)
    return (
      <EmptyState
        title="No applications tracked yet"
        body="Set a status like Interested or Applied on any job and it will appear here."
        action={<Link href="/jobs" className="btn-primary">Find jobs</Link>}
      />
    );

  const now = Date.now();
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4">
      <div className="grid min-w-[1000px] grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const list = cards.filter((c) => c.status === col);
          return (
            <section
              key={col}
              aria-label={STATUS_LABELS[col]}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (dragging) move(dragging, col);
                setDragging(null);
              }}
              className={cx("flex min-h-64 flex-col rounded-2xl border border-t-4 border-slate-200 bg-slate-100/60 p-3 transition", COLUMN_STYLE[col], over === col && "bg-brand-50 ring-2 ring-brand-300")}
            >
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
                {STATUS_LABELS[col]} <span className="chip bg-white text-slate-500">{list.length}</span>
              </h2>
              <div className="space-y-2">
                {list.map((c) => {
                  const overdue = c.followUpAt && new Date(c.followUpAt).getTime() < now && col !== "offer" && col !== "rejected";
                  return (
                    <article
                      key={c.jobId}
                      draggable
                      onDragStart={() => setDragging(c.jobId)}
                      onDragEnd={() => setDragging(null)}
                      className={cx("card cursor-grab p-3 text-sm active:cursor-grabbing", dragging === c.jobId && "opacity-50")}
                    >
                      <Link href={`/jobs/${encodeURIComponent(c.jobId)}`} className="leading-snug font-semibold hover:text-brand-700">{c.title}</Link>
                      <p className="text-xs text-slate-600">{c.company}</p>
                      <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                        {c.appliedAt && <p>Applied {relativeDate(c.appliedAt).toLowerCase()}</p>}
                        {c.followUpAt && (
                          <p className={overdue ? "font-semibold text-rose-600" : ""}>{overdue ? "⏰ Follow-up overdue" : `Follow up ${new Date(c.followUpAt).toLocaleDateString()}`}</p>
                        )}
                        {c.contactName && (
                          <p>
                            👤 {c.contactName}
                            {c.contactEmail && <> · <a className="underline" href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a></>}
                          </p>
                        )}
                        <p>📄 {c.resumeName}</p>
                      </div>
                      <select aria-label={`Move ${c.title}`} className="mt-2 w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs" value={c.status} onChange={(e) => move(c.jobId, e.target.value)}>
                        {COLUMNS.map((s) => <option key={s} value={s}>Move to: {STATUS_LABELS[s]}</option>)}
                      </select>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
