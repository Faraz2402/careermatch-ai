import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/api";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().max(200) });

// Compared against when the email doesn't exist, so response timing doesn't
// reveal which emails have accounts.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-0"));

export async function POST(req: Request) {
  const { data, error } = await readBody(req, Body);
  if (error) return error;
  const ipLimit = await rateLimit(`login:ip:${clientIp(req)}`, 30, 15 * 60_000);
  const emailLimit = await rateLimit(`login:email:${data.email}`, 8, 15 * 60_000);
  if (!ipLimit.ok || !emailLimit.ok) return jsonError("Too many sign-in attempts. Please wait a few minutes.", 429);

  const user = await db.user.findUnique({ where: { email: data.email } });
  const valid = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return jsonError("Incorrect email or password.", 401);

  await createSession(user.id);
  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { id: true } });
  return NextResponse.json({ ok: true, redirect: profile ? "/dashboard" : "/onboarding" });
}
