import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Developer Analytics Platform`,
    short_name: SITE_NAME,
    description:
      "Analyze your GitHub, LeetCode, and Codeforces profiles. Get a unified dev score, AI insights, and role-fit analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
