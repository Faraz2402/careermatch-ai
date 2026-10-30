import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody, jsonError } from "@/lib/api";
import { consumePasswordReset, validatePassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const Body = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) });

export async function POST(req: Request) {
  if (!(await rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000)).ok) return jsonError("Too many attempts. Try again later.", 429);
  const { data, error } = await readBody(req, Body);
  if (error) return error;
  const pwError = validatePassword(data.password);
  if (pwError) return jsonError(pwError);
  if (!(await consumePasswordReset(data.token, data.password)))
    return jsonError("This reset link is invalid or has expired. Request a new one.", 400);
  return NextResponse.json({ ok: true, redirect: "/login?reset=1" });
}
