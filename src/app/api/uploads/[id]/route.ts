import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { deleteUpload, getUploadFile } from "@/lib/resume/uploads";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Download the original file exactly as it was uploaded. */
export async function GET(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  const file = await getUploadFile(user.id, (await params).id);
  if (!file) return jsonError("File not found.", 404);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${file.fileName.replace(/["\\\r\n]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await deleteUpload(user.id, (await params).id))) return jsonError("File not found.", 404);
  return NextResponse.json({ ok: true });
}
