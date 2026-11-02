import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/site-url";
import { COUNTRY_SLUGS, publishedRoles, samplesFor, visibleCategories } from "@/lib/resume-examples/data";
import { COUNTRY_CODES } from "@/lib/resume-examples/types";

export const revalidate = 3600; // rebuilt at most hourly

/** Public pages, plus profiles their owners chose to publish. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/resume-examples`, changeFrequency: "weekly", priority: 0.8 },
    ...visibleCategories().map((c) => ({ url: `${base}/resume-examples/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...publishedRoles().map((r) => ({ url: `${base}/resume-examples/${r.category}/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...samplesFor({}).map((x) => ({ url: `${base}/resume-examples/${x.category}/${x.role}/${COUNTRY_SLUGS[x.country]}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...COUNTRY_CODES.map((c) => ({ url: `${base}/resume-examples/country/${COUNTRY_SLUGS[c]}`, changeFrequency: "monthly" as const, priority: 0.5 })),
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
