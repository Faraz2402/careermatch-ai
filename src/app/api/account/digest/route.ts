import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { sendDailyDigest } from "@/lib/daily-digest";
import { db } from "@/lib/db";
import { planOf } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ enabled: z.boolean().optional(), sendTest: z.boolean().optional() });

/** Turn the daily email on/off, or send yourself one now to preview it. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;

  if (data.enabled !== undefined) await db.user.update({ where: { id: user.id }, data: { digestOptOut: !data.enabled } });

  if (data.sendTest) {
    if (planOf(user) !== "pro") return jsonError("The daily email is part of Pro.", 403);
    if (!(await rateLimit(`digest-test:${user.id}`, 3, 60 * 60_000)).ok) return jsonError("You can send 3 test emails an hour.", 429);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const r = await sendDailyDigest(row, { force: true });
    return NextResponse.json(r.sent ? { ok: true, message: `Sent ${r.count} matches to ${row.email}.` } : { ok: false, message: "No matches scoring 50+ were posted in the last few days. Try widening your preferences." });
  }
  return NextResponse.json({ ok: true });
}
