import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE = "cm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
const RESET_TTL_MS = 1000 * 60 * 30; // 30 minutes

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    return "Password must contain at least one letter and one number.";
  return null;
}

/** Creates a DB-backed session; only a hash of the token is stored. */
export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: { select: { id: true, email: true, name: true, isDemo: true, role: true, plan: true, planRenewsAt: true, emailVerifiedAt: true, googleId: true, microsoftId: true, linkedinId: true, createdAt: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return { ...session.user, isAdmin: isAdminUser(session.user) };
}

const adminEmails = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isAdminUser = (u: { role: string; email: string }) => u.role === "admin" || adminEmails().includes(u.email.toLowerCase());

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For server components / pages: redirect to sign-in when unauthenticated. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function createPasswordReset(userId: string) {
  const token = newToken();
  await db.passwordResetToken.create({
    data: { tokenHash: sha256(token), userId, purpose: "reset", expiresAt: new Date(Date.now() + RESET_TTL_MS) },
  });
  return token;
}

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function createEmailVerification(userId: string) {
  const token = newToken();
  await db.passwordResetToken.create({
    data: { tokenHash: sha256(token), userId, purpose: "verify", expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
  });
  return token;
}

export async function consumeEmailVerification(token: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== "verify" || record.usedAt || record.expiresAt < new Date()) return null;
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return record.userId;
}

export async function consumePasswordReset(token: string, newPassword: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.purpose !== "reset" || record.usedAt || record.expiresAt < new Date()) return false;
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Changing a password signs out every existing session.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return true;
}
