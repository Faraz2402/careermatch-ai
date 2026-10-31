"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/format";
import { api } from "./client";
import { useToast } from "./toast";

/** Red-dot "No longer accepting applications" label. */
export function ExpiredBadge({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-sm font-medium text-rose-700", className)}>
      <span className="size-2 rounded-full bg-rose-500" aria-hidden />
      No longer accepting applications
    </span>
  );
}

/**
 * Dropdown to report a listing as expired (or undo). Expired jobs show the
 * badge and leave the feed at the next daily refresh.
 */
export function ListingStatus({ jobId, expiredAt, onChange, className }: { jobId: string; expiredAt: string | null; onChange?: (expiredAt: string | null) => void; className?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [value, setValue] = useState(expiredAt);
  const [busy, setBusy] = useState(false);

  async function set(expired: boolean) {
    setBusy(true);
    const prev = value;
    try {
      const r = await api<{ expiredAt: string | null }>(`/api/jobs/${encodeURIComponent(jobId)}/expired`, { method: "POST", json: { expired } });
      setValue(r.expiredAt);
      if (onChange) onChange(r.expiredAt);
      else router.refresh(); // server-rendered page: re-render the badge
      toast(expired ? "Marked as expired. It'll leave the feed at the next daily refresh." : "Marked as open again.", "info");
    } catch (e) {
      setValue(prev);
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      aria-label="Listing status"
      title="Is this job still open?"
      className={cx("rounded-md border border-slate-200 bg-surface px-2 py-1 text-xs", value && "border-rose-300 text-rose-700", className)}
      value={value ? "expired" : "open"}
      disabled={busy}
      onChange={(e) => set(e.target.value === "expired")}
    >
      <option value="open">Listing open</option>
      <option value="expired">Expired</option>
    </select>
  );
}
