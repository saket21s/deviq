import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_PAGES } from "@/lib/seo";

// Dynamic XML sitemap: https://www.deviq.online/sitemap.xml
// Only public, indexable, server-rendered pages. Auth, API, dashboard
// state, and OAuth callback routes are intentionally excluded.

const LAST_MOD = new Date("2026-03-15");

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: LAST_MOD,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
