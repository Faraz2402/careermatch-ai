import { NextResponse } from "next/server";
import { apiAdmin, jsonError } from "@/lib/api";
import { refreshSources } from "@/lib/jobs/ingest";
import { ALL_SOURCES } from "@/lib/jobs/registry";

export const maxDuration = 60; // Vercel Hobby limit

/** Run one source now (still subject to its rate limit). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await apiAdmin();
  if (error) return error;
  const { id } = await params;
  if (!ALL_SOURCES.some((s) => s.id === id)) return jsonError("Unknown source.", 404);
  const report = await refreshSources({ force: true, onlyIds: [id], budgetMs: 55_000 }); // one source: use the whole request
  const r = report.ran.find((x) => x.id === id);
  if (!r) return jsonError("Source is disabled or not configured.", 400);
  return NextResponse.json(r);
}
