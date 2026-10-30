import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { createSession, hashPassword, validatePassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ current: z.string().max(200).optional(), next: z.string().max(200) });

/** Change password; signs out all other sessions. */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`pw:${user.id}`, 5, 15 * 60_000)).ok) return jsonError("Too many attempts. Try later.", 429);
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  // Google-only accounts may set a first password without the current one.
  const needsCurrent = !row.googleId;
  if (needsCurrent && !(data.current && (await verifyPassword(data.current, row.passwordHash)))) return jsonError("Current password is incorrect.", 401);
  const problem = validatePassword(data.next);
  if (problem) return jsonError(problem);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.next) } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
