import "server-only";
// Original résumé files, kept exactly as uploaded so the master résumé can
// always be traced back to (and restored from) its source. Never updated in
// place: a new upload is a new row. Users can delete them from the Studio.

import { seal, unseal } from "../crypto";
import { db } from "../db";
import type { ExtractResult } from "./extract";

/** Uploads kept per user; the oldest are removed beyond this. */
const KEEP = 10;

export type UploadSummary = { id: string; fileName: string; size: number; mimeType: string; extractedBy: string; createdAt: string };

export async function saveUpload(userId: string, fileName: string, r: ExtractResult) {
  const row = await db.resumeUpload.create({
    data: {
      userId,
      fileName: fileName.slice(0, 200),
      mimeType: r.mimeType,
      size: r.bytes.byteLength,
      data: seal(Buffer.from(r.bytes).toString("base64")),
      text: seal(r.text),
      extractedBy: r.ocr ? "ocr" : "text",
    },
    select: { id: true },
  });
  const old = await db.resumeUpload.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: KEEP, select: { id: true } });
  if (old.length) await db.resumeUpload.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return row.id;
}

export async function listUploads(userId: string): Promise<UploadSummary[]> {
  const rows = await db.resumeUpload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, size: true, mimeType: true, extractedBy: true, createdAt: true },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

/** The original file, for download. */
export async function getUploadFile(userId: string, id: string) {
  const row = await db.resumeUpload.findFirst({ where: { id, userId } });
  if (!row) return null;
  return { fileName: row.fileName, mimeType: row.mimeType, bytes: Buffer.from(unseal(row.data), "base64"), text: unseal(row.text) };
}

export async function deleteUpload(userId: string, id: string) {
  const { count } = await db.resumeUpload.deleteMany({ where: { id, userId } });
  return count > 0;
}
