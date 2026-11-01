import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { DEMO_RESUME_TEXT } from "@/lib/demo-resume";
import { rateLimit } from "@/lib/rate-limit";
import { extractResumeText, normalize } from "@/lib/resume/extract";
import { parseResume } from "@/lib/resume/parse";
import { saveUpload } from "@/lib/resume/uploads";

export const runtime = "nodejs";

/**
 * Parse a resume (multipart file upload, pasted text, or the demo resume).
 * Returns structured data for the user to review - nothing is saved until
 * they confirm via PUT /api/profile.
 */
export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`parse:${user.id}`, 10, 10 * 60_000)).ok) return jsonError("You've parsed several resumes in a row. Please wait a few minutes.", 429);

  let text = "";
  let format = "text";
  let upload: { file: File; result: Awaited<ReturnType<typeof extractResumeText>> } | null = null;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("No file uploaded.");
      const res = await extractResumeText(file);
      text = res.text;
      format = res.format;
      upload = { file, result: res };
    } else {
      const body = (await req.json().catch(() => ({}))) as { text?: string; demo?: boolean };
      text = body.demo ? DEMO_RESUME_TEXT : normalize(String(body.text ?? ""));
    }
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Couldn't read that file.");
  }

  if (text.length < 80)
    return jsonError(
      format === "pdf"
        ? "We couldn't find selectable text in this PDF (it may be a scanned image). Try a DOCX or paste the text."
        : "That resume looks too short to parse. Paste the full text.",
    );
  if (text.length > 100_000) return jsonError("That resume is too long (over 100k characters).");

  // Keep the original file exactly as uploaded (the immutable source of the master résumé).
  const uploadId = upload ? await saveUpload(user.id, upload.file.name, upload.result) : null;
  const ocr = upload?.result.ocr ?? false;
  const outcome = await parseResume(text);
  const warning = [ocr && "This PDF is a scanned image, so its text was read by AI. Check every section carefully before saving.", outcome.warning].filter(Boolean).join(" ");
  return NextResponse.json({ ...outcome, text, format, uploadId, ocr, ...(warning && { warning }) });
}
