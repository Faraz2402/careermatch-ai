"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, api } from "./client";

/** Landing page for the bookmarklet. Importing always needs an explicit click. */
export function ImportConfirm({ url }: { url: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* invalid */
  }
  return (
    <div className="mx-auto max-w-lg">
      <div className="card space-y-4 p-6">
        <h1 className="font-serif text-3xl font-normal">Import this job?</h1>
        {host ? (
          <>
            <p className="text-sm text-slate-600">CareerMatch will read the public job posting at:</p>
            <p className="rounded-lg bg-slate-50 p-3 text-sm break-all"><b>{host}</b><br /><span className="text-slate-500">{url}</span></p>
          </>
        ) : (
          <Alert>No valid job link was provided.</Alert>
        )}
        {error && <Alert>{error}</Alert>}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => router.push("/jobs")}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!host || busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const r = await api<{ id: string }>("/api/jobs/import", { method: "POST", json: { url } });
                router.push(`/jobs/${encodeURIComponent(r.id)}`);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? "Importing…" : "Import & match"}
          </button>
        </div>
      </div>
    </div>
  );
}
