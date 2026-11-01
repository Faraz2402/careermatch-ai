import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site-url";

/** Search engines may crawl the public site; the signed-in app and APIs stay out. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy", "/terms", "/refund-policy", "/cancellation-policy", "/signup", "/p/"],
        disallow: [
          "/api/",
          "/dashboard",
          "/onboarding",
          "/profile",
          "/preferences",
          "/jobs",
          "/sources",
          "/applications",
          "/alerts",
          "/resumes",
          "/settings",
          "/admin",
          "/import",
          "/tools",
          "/dev",
          "/login",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${appUrl()}/sitemap.xml`,
    host: appUrl(),
  };
}
