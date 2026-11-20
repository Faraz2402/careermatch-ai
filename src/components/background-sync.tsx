"use client";

import { useEffect } from "react";

const KEY = "cm:bg-sync";
const EVERY_MS = 10 * 60_000;

/**
 * When the user switches to another tab or window, ask the server to load the
 * complete descriptions of new listings while they're away (at most every 10
 * minutes). The server does the work after responding, so nothing waits.
 */
export function BackgroundSync() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "hidden") return;
      let last = 0;
      try {
        last = Number(localStorage.getItem(KEY)) || 0;
      } catch {
        /* storage blocked: fall back to the in-memory guard */
      }
      if (Date.now() - last < EVERY_MS) return;
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      fetch("/api/jobs/hydrate", { method: "POST", keepalive: true, credentials: "same-origin" }).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", ping);
    return () => document.removeEventListener("visibilitychange", ping);
  }, []);
  return null;
}
