import { apiUser } from "@/lib/api";
import { unsealJson } from "@/lib/crypto";
import { db, parseJson } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

/** GDPR-style export of everything we store about the user, as JSON. */
export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!(await rateLimit(`export:${user.id}`, 5, 60 * 60_000)).ok) return new Response("Too many exports", { status: 429 });
  const [account, profile, prefs, versions, states, generations, searches, usage, imports] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, email: true, name: true, plan: true, emailVerifiedAt: true, createdAt: true, googleId: true } }),
    getProfile(user.id),
    db.preferences.findUnique({ where: { userId: user.id } }),
    db.resumeVersion.findMany({ where: { userId: user.id } }),
    db.userJob.findMany({ where: { userId: user.id }, include: { job: { select: { title: true, company: true, url: true, source: true } } } }),
    db.generation.findMany({ where: { userId: user.id } }),
    db.savedSearch.findMany({ where: { userId: user.id } }),
    db.usageEvent.findMany({ where: { userId: user.id }, select: { kind: true, createdAt: true } }),
    db.job.findMany({ where: { importedById: user.id } }),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    account: { ...account, googleLinked: !!account.googleId, googleId: undefined },
    profile: profile && { slug: profile.slug, isPublic: profile.isPublic, theme: profile.theme, views: profile.views, data: profile.data, visibility: profile.visibility, resumeText: profile.resumeText },
    preferences: parseJson(prefs?.data, null),
    resumeVersions: versions.map((v) => ({ name: v.name, createdAt: v.createdAt, data: unsealJson(v.data, null) })),
    trackedJobs: states.map((s) => ({ ...s, userId: undefined, id: undefined })),
    generatedDocuments: generations.map((g) => ({ kind: g.kind, jobId: g.jobId, engine: g.engine, createdAt: g.createdAt, content: unsealJson(g.content, null), reviewed: g.finalContent ? unsealJson(g.finalContent, null) : null })),
    savedSearches: searches.map((s) => ({ name: s.name, frequency: s.frequency, filters: parseJson(s.filters, {}) })),
    importedJobs: imports,
    usage,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="careermatch-export-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" },
  });
}
