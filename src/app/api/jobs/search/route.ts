import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { searchJobs, type SearchFilters } from "@/lib/jobs/service";
import { rateLimit } from "@/lib/rate-limit";

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : undefined);
const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export async function GET(req: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`search:${user.id}`, 60, 60_000)).ok) return jsonError("Too many searches. Slow down a little.", 429);

  const p = new URL(req.url).searchParams;
  const view = p.get("view");
  const filters: SearchFilters = {
    q: p.get("q") ?? undefined,
    skills: p.get("skills") ?? undefined,
    company: p.get("company") ?? undefined,
    location: p.get("location") ?? undefined,
    country: p.get("country") ?? undefined,
    city: p.get("city") ?? undefined,
    includeRemote: p.get("includeRemote") !== "0",
    workMode: list(p.get("workMode")),
    salaryMin: num(p.get("salaryMin")),
    postedWithinDays: num(p.get("posted")),
    seniority: list(p.get("seniority")),
    jobType: list(p.get("jobType")),
    sources: list(p.get("sources")),
    onlySalary: p.get("onlySalary") === "1",
    view: view === "saved" || view === "hidden" || view === "applied" ? view : "all",
    sort: p.get("sort") === "date" ? "date" : "match",
    page: num(p.get("page")),
    refresh: p.get("refresh") === "1" && (await rateLimit(`refresh:${user.id}`, 3, 10 * 60_000)).ok,
  };
  try {
    return NextResponse.json(await searchJobs(user.id, filters));
  } catch (err) {
    console.error("[jobs/search]", err);
    return jsonError("Job search failed. Please try again.", 500);
  }
}
