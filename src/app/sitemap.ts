import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/site-url";

export const revalidate = 3600; // rebuilt at most hourly

/** Public pages, plus profiles their owners chose to publish. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cancellation-policy`, changeFrequency: "yearly", priority: 0.3 },
  ];
  const profiles = await db.profile
    .findMany({ where: { isPublic: true, user: { isDemo: false } }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5000 })
    .catch(() => []);
  return [...pages, ...profiles.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.5 }))];
}
