import "server-only";
// AES-256-GCM encryption for resume data at rest. Values are stored as
// "enc:v1:<base64(iv|tag|ciphertext)>"; legacy plaintext is read as-is so
// existing rows keep working and get encrypted on their next write.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";
let key: Buffer | null = null;

function getKey(): Buffer {
  if (key) return key;
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, "base64");
    key = buf.length === 32 ? buf : createHash("sha256").update(raw).digest();
  } else {
    if (process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY must be set in production.");
    // Development-only fallback so the app runs without setup.
    key = createHash("sha256").update("careermatch-dev-only-key").digest();
  }
  return key;
}

export function seal(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function unseal(value: string | null | undefined): string {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), "base64");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export const sealJson = (v: unknown) => seal(JSON.stringify(v));

export function unsealJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    const s = unseal(value);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
