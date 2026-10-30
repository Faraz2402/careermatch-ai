import "server-only";
import { cache } from "react";
import { getCurrentUser } from "./auth";
import { getProfileBySlug } from "./profile";
import { redactForPublic } from "./resume/schema";

/** Loads a profile the current viewer may see, with hidden fields removed. */
export const loadPublicProfile = cache(async (slug: string) => {
  const p = await getProfileBySlug(slug);
  if (!p) return null;
  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === p.userId;
  // Private profiles are visible only to their owner.
  if (!p.isPublic && !isOwner) return null;
  return { ...p, isOwner, data: redactForPublic(p.data, p.visibility), resumeText: "" };
});
