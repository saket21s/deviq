import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// https://www.deviq.online/robots.txt
// Public SEO pages and the interactive tool are crawlable; auth, API,
// and private app state are disallowed.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/profile",
          "/settings",
          "/history",
          "/following",
          "/chat",
          "/practice",
          "/compare",
          "/analyze",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
