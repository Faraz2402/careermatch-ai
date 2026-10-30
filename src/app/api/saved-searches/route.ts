import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readBody } from "@/lib/api";
import { db, parseJson } from "@/lib/db";
import { PLANS, planOf } from "@/lib/plans";

const FiltersSchema = z.object({
  q: z.string().max(200).optional(),
  skills: z.string().max(300).optional(),
  company: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  country: z.string().max(12).optional(),
  city: z.string().max(100).optional(),
  includeRemote: z.boolean().optional(),
  workMode: z.array(z.string()).max(3).optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  postedWithinDays: z.number().int().positive().optional(),
  seniority: z.array(z.string()).max(6).optional(),
  jobType: z.array(z.string()).max(5).optional(),
  sources: z.array(z.string()).max(12).optional(),
  onlySalary: z.boolean().optional(),
});

export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const rows = await db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ searches: rows.map((s) => ({ ...s, filters: parseJson(s.filters, {}) })) });
}

const Body = z.object({ name: z.string().trim().min(1).max(80), filters: FiltersSchema, frequency: z.enum(["off", "daily", "weekly"]) });

export async function POST(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const { data, error: bodyError } = await readBody(req, Body);
  if (bodyError) return bodyError;
  const limit = PLANS[planOf(user)].savedSearches;
  if ((await db.savedSearch.count({ where: { userId: user.id } })) >= limit) return jsonError(`Your plan allows ${limit} saved searches.`, 403);
  const s = await db.savedSearch.create({ data: { userId: user.id, name: data.name, frequency: data.frequency, filters: JSON.stringify(data.filters) } });
  return NextResponse.json({ id: s.id });
}
