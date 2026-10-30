import "server-only";
import { timingSafeEqual } from "node:crypto";
import { jsonError } from "./api";

/** Accepts `Authorization: Bearer $CRON_SECRET` (Vercel Cron convention). */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export const cronDenied = () => jsonError("Unauthorized", 401);
