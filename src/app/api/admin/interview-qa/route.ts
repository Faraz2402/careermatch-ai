import { NextResponse } from "next/server";
import { apiAdmin } from "@/lib/api";
import { db } from "@/lib/db";
import { refreshInterviewQuestions } from "@/lib/interview-qa/ingest";
import { invalidateInterviewCache, toQ } from "@/lib/interview-qa/store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Pending user reports, plus per-source counts. */
export async function GET() {
  const { error } = await apiAdmin();
  if (error) return error;
  const [pending, bySource] = await Promise.all([
    db.interviewQuestion.findMany({ where: { status: "pending" }, orderBy: { firstSeenAt: "asc" }, take: 50 }),
    db.interviewQuestion.groupBy({ by: ["source"], where: { status: "published" }, _count: { _all: true } }),
  ]);
  return NextResponse.json({ pending: pending.map(toQ), sources: bySource.map((s) => ({ source: s.source, count: s._count._all })) });
}

/** Refresh every collection now. */
export async function POST() {
  const { error } = await apiAdmin();
  if (error) return error;
  const results = await refreshInterviewQuestions({ force: true, budgetMs: 50_000 });
  invalidateInterviewCache();
  return NextResponse.json({ results });
}
