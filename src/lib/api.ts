import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getCurrentUser } from "./auth";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Returns the user or a 401 response for API routes. */
export async function apiUser() {
  const user = await getCurrentUser();
  return user
    ? ({ user, error: null } as const)
    : ({ user: null, error: jsonError("Not signed in.", 401) } as const);
}

export async function readBody<T>(req: Request, schema: ZodType<T>) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: jsonError("Invalid JSON body.") } as const;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    return { data: null, error: jsonError(msg) } as const;
  }
  return { data: parsed.data, error: null } as const;
}

/** API guard for operator-only routes. */
export async function apiAdmin() {
  const r = await apiUser();
  if (r.error) return r;
  if (!r.user.isAdmin) return { user: null, error: jsonError("Admins only.", 403) } as const;
  return r;
}
