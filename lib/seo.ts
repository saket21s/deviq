import type { Metadata } from "next";

/**
 * Central SEO configuration for DevIQ.
 * Single source of truth for site URL, branding, and metadata builders.
 * Production domain: https://deviq.online
 */

export const SITE_URL = "https://deviq.online";
export const SITE_NAME = "DevIQ";
export const SITE_LOCALE = "en_US";
export const TWITTER_HANDLE = "@deviq_online";
export const OG_IMAGE = `${SITE_URL}/opengraph-image`;

export const DEFAULT_TITLE =
  "DevIQ — Developer Analytics Platform | GitHub, LeetCode & Codeforces Score";
export const DEFAULT_DESCRIPTION =
  "Analyze your developer profile across GitHub, LeetCode, and Codeforces. Get a unified dev score, AI insights, role-fit analysis, contribution heatmaps, head-to-head comparisons, and personalized improvement plans — all in one place.";

export interface PageSeo {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  noindex?: boolean;
}

export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${SITE_URL}${path}`;
}

/** Build per-page Metadata with canonical, OG, and Twitter cards. */
export function buildMetadata({
  title,
  description,
  path,
  keywords,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  noindex,
}: PageSeo): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image ?? OG_IMAGE;
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    ...(noindex
      ? { robots: { index: false, follow: false } }
      : {
          robots: {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              "max-video-preview": -1,
              "max-image-preview": "large",
              "max-snippet": -1,
            },
          },
        }),
    openGraph: {
      type,
      locale: SITE_LOCALE,
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: TWITTER_HANDLE,
    },
  };
}

/* ── JSON-LD builders (Schema.org) ─────────────────────────────── */

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    sameAs: [`https://x.com/deviq_online`, `https://github.com`],
  };
}

export function softwareAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "GitHub repository analytics and language distribution",
      "LeetCode problem solving statistics",
      "Codeforces competitive programming rating tracker",
      "Unified developer score across platforms",
      "AI-powered developer insights and improvement plans",
      "Developer role-fit analysis",
      "Head-to-head developer comparison",
      "Contribution heatmap and streak tracking",
      "Company-tagged practice problems",
    ],
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function webPageJsonLd(opts: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.title,
    description: opts.description,
    url: absoluteUrl(opts.path),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    inLanguage: "en",
  };
}

export function breadcrumbJsonLd(
  crumbs: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  publishedTime: string;
  modifiedTime?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    url: absoluteUrl(opts.path),
    datePublished: opts.publishedTime,
    ...(opts.modifiedTime ? { dateModified: opts.modifiedTime } : {}),
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    inLanguage: "en",
  };
}

/* ── Sitemap source of truth ─────────────────────────────────────
   Only public, indexable, server-rendered pages. Never auth, API,
   dashboard-state, or callback routes. */

export interface SitemapEntry {
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}

export const PUBLIC_PAGES: SitemapEntry[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/github-profile-analyzer", changeFrequency: "monthly", priority: 0.9 },
  { path: "/leetcode-profile-analyzer", changeFrequency: "monthly", priority: 0.9 },
  { path: "/codeforces-profile-analyzer", changeFrequency: "monthly", priority: 0.9 },
  { path: "/developer-analytics", changeFrequency: "monthly", priority: 0.9 },
  { path: "/developer-skill-score", changeFrequency: "monthly", priority: 0.85 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog/how-to-analyze-github-profile", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog/how-to-track-leetcode-progress", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog/what-is-developer-skill-score", changeFrequency: "monthly", priority: 0.7 },
];
