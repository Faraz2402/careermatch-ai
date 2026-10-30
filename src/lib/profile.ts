import "server-only";
import { randomBytes } from "node:crypto";
import { seal, sealJson, unseal, unsealJson } from "./crypto";
import { db, parseJson } from "./db";
import { defaultVisibility, emptyResume, type ResumeData, type Visibility } from "./resume/schema";

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const RESERVED = new Set(["admin", "api", "login", "signup", "dashboard", "profile", "jobs", "settings", "demo", "p"]);
export const THEMES = ["aurora", "minimal", "sunset"] as const;
export type Theme = (typeof THEMES)[number];

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "me";
}

export async function slugAvailable(slug: string, userId?: string) {
  if (!SLUG_RE.test(slug) || RESERVED.has(slug)) return false;
  const existing = await db.profile.findUnique({ where: { slug } });
  return !existing || existing.userId === userId;
}

export async function uniqueSlug(base: string, userId?: string) {
  const root = slugify(base);
  if (await slugAvailable(root, userId)) return root;
  for (let i = 0; i < 5; i++) {
    const candidate = `${root.slice(0, 30)}-${randomBytes(2).toString("hex")}`;
    if (await slugAvailable(candidate, userId)) return candidate;
  }
  return `${root.slice(0, 24)}-${randomBytes(4).toString("hex")}`;
}

export type ProfileRecord = {
  id: string;
  userId: string;
  slug: string;
  isPublic: boolean;
  theme: Theme;
  views: number;
  parsedBy: string;
  data: ResumeData;
  visibility: Visibility;
  resumeText: string;
};

type Row = NonNullable<Awaited<ReturnType<typeof db.profile.findUnique>>>;

export function decodeProfile(p: Row): ProfileRecord {
  return {
    id: p.id,
    userId: p.userId,
    slug: p.slug,
    isPublic: p.isPublic,
    theme: (THEMES as readonly string[]).includes(p.theme) ? (p.theme as Theme) : "aurora",
    views: p.views,
    parsedBy: p.parsedBy,
    data: { ...emptyResume(), ...unsealJson<Partial<ResumeData>>(p.data, {}) },
    visibility: { ...defaultVisibility(), ...parseJson<Partial<Visibility>>(p.visibility, {}) },
    resumeText: unseal(p.resumeText),
  };
}

export async function getProfile(userId: string) {
  const p = await db.profile.findUnique({ where: { userId } });
  return p ? decodeProfile(p) : null;
}

export async function getProfileBySlug(slug: string) {
  const p = await db.profile.findUnique({ where: { slug } });
  return p ? decodeProfile(p) : null;
}

export async function saveParsedProfile(userId: string, data: ResumeData, resumeText: string, parsedBy: string) {
  const sealed = { data: sealJson(data), resumeText: resumeText ? seal(resumeText) : "", parsedBy, embedding: null };
  const existing = await db.profile.findUnique({ where: { userId } });
  if (existing) return db.profile.update({ where: { userId }, data: sealed });
  return db.profile.create({
    data: { userId, slug: await uniqueSlug(data.name || "me", userId), visibility: JSON.stringify(defaultVisibility()), ...sealed },
  });
}

/** Resume used for matching/generation: the profile, or a named version. */
export async function getBaseResume(userId: string, resumeVersionId?: string | null) {
  if (resumeVersionId) {
    const v = await db.resumeVersion.findFirst({ where: { id: resumeVersionId, userId } });
    if (v) return { data: { ...emptyResume(), ...unsealJson<Partial<ResumeData>>(v.data, {}) }, versionId: v.id, name: v.name };
  }
  const p = await getProfile(userId);
  return p ? { data: p.data, versionId: null, name: "Primary profile" } : null;
}
