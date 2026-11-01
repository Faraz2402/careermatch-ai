import { NextResponse } from "next/server";
import { apiUser } from "@/lib/api";
import { listUploads } from "@/lib/resume/uploads";

/** The user's original résumé files (newest first). */
export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  return NextResponse.json({ uploads: await listUploads(user.id) });
}
