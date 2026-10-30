import { NextResponse } from "next/server";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/account-emails";
import { readBody, jsonError } from "@/lib/api";
import { createSession, hashPassword, validatePassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().max(200),
});

export async function POST(req: Request) {
  if (!(await rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60_000)).ok) return jsonError("Too many sign-up attempts. Try again later.", 429);
  const { data, error } = await readBody(req, Body);
  if (error) return error;
  const pwError = validatePassword(data.password);
  if (pwError) return jsonError(pwError);
  if (await db.user.findUnique({ where: { email: data.email } }))
    return jsonError("An account with this email already exists. Try signing in.", 409);

  const user = await db.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password) },
  });
  await createSession(user.id);
  await sendVerificationEmail(user).catch(() => undefined); // resendable from Settings
  return NextResponse.json({ ok: true, redirect: "/onboarding" });
}
