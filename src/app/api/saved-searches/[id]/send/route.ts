import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/alerts";
import { apiUser, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { mailConfigured } from "@/lib/mailer";
import { rateLimit } from "@/lib/rate-limit";

/** "Send me a digest now" - includes current matches, not only new ones. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`digest:${user.id}`, 5, 60 * 60_000)).ok) return jsonError("Too many test digests. Try later.", 429);
  const id = (await params).id;
  if (!(await db.savedSearch.findFirst({ where: { id, userId: user.id } }))) return jsonError("Not found.", 404);
  const r = await sendDigest(id, { force: true });
  return NextResponse.json({ ...r, delivered: mailConfigured() });
}
