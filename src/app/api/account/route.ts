import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { destroySession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { cancelStripeCustomer } from "@/lib/billing";

const Body = z.object({ password: z.string().optional(), confirm: z.literal("DELETE") });

/** Permanently delete the account and all of its data (cascades). */
export async function DELETE(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return jsonError('Type "DELETE" to confirm.');
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  // Password accounts must re-enter their password; Google-only accounts confirm by typing DELETE.
  if (!row.googleId && !row.isDemo && !(data.password && (await verifyPassword(data.password, row.passwordHash))))
    return jsonError("Incorrect password.", 401);

  if (row.stripeCustomerId) await cancelStripeCustomer(row.stripeCustomerId).catch((e) => log.error("billing.cancel_failed", { message: String(e) }));
  await db.job.deleteMany({ where: { importedById: user.id } });
  await db.outboxEmail.deleteMany({ where: { to: row.email } });
  await db.user.delete({ where: { id: user.id } });
  await destroySession();
  log.info("account.deleted", { userId: user.id });
  return NextResponse.json({ ok: true, redirect: "/" });
}
