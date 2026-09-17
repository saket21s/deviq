# DevIQ SEO Documentation

Production domain: **https://www.deviq.online**

> Canonical host is `www`. The apex (`deviq.online`) must 301-redirect to
> `https://www.deviq.online` at the DNS/hosting layer, and `www.deviq.online`
> must actually serve the site — otherwise canonicals, sitemap, and OG URLs
> will point at a host that doesn't resolve. `public/CNAME` and DNS are the
> deployment-side pieces of this (not changed in code).

## 1. SEO architecture

- **Framework:** Next.js 15 (App Router) + React 18. `app/layout.tsx` holds global
  `Metadata`; every public page exports its own `metadata` via the shared
  `buildMetadata()` helper in `lib/seo.ts`.
- **Single source of truth:** `lib/seo.ts` — site URL, titles/descriptions builder,
  JSON-LD builders, and `PUBLIC_PAGES` (the sitemap source).
- **Reusable components:** `components/seo.tsx` — `JsonLd`, `Breadcrumbs`,
  `FaqSection`, `ToolCta`, `RelatedPages`.
- **Hybrid rendering (intentional):** the interactive tool (`app/page.tsx`) is a
  client-side SPA (requires JS for dashboards, playground, OAuth). All SEO landing
  and blog pages are **server components** with fully server-rendered H1, content,
  links, and JSON-LD so crawlers get complete HTML with no JS.
- **Social image:** dynamic `app/opengraph-image.tsx` (1200×630) — no static asset
  to maintain. Referenced as `OG_IMAGE` in every page's OG/Twitter metadata.
- **PWA/site identity:** `app/manifest.ts`.

## 2. Public (indexable) pages

| URL | Intent served |
|---|---|
| `/` | Branded + "developer analytics platform" |
| `/github-profile-analyzer` | GitHub profile analyzer / GitHub stats |
| `/leetcode-profile-analyzer` | LeetCode analyzer / LeetCode stats |
| `/codeforces-profile-analyzer` | Codeforces analyzer / rating tracker |
| `/developer-analytics` | Developer analytics dashboard |
| `/developer-skill-score` | Developer skill score / dev score calculator |
| `/blog` | Blog index |
| `/blog/how-to-analyze-github-profile` | "how to analyze github profile" guide |
| `/blog/how-to-track-leetcode-progress` | "how to track leetcode progress" guide |
| `/blog/what-is-developer-skill-score` | "what is developer skill score" explainer |

## 3. Keyword → page mapping (search intent, one page per intent)

| Query cluster | Target page | Intent |
|---|---|---|
| github profile analyzer, github profile analytics, github stats | `/github-profile-analyzer` | Tool |
| leetcode profile analyzer, leetcode stats, leetcode progress tracker | `/leetcode-profile-analyzer` | Tool |
| codeforces profile analyzer, codeforces rating tracker | `/codeforces-profile-analyzer` | Tool |
| developer analytics dashboard, coding statistics dashboard | `/developer-analytics` | Category |
| developer skill score, dev score calculator, coding score | `/developer-skill-score` | Explainer + tool |
| how to analyze github profile | `/blog/how-to-analyze-github-profile` | Informational |
| how to track leetcode progress | `/blog/how-to-track-leetcode-progress` | Informational |
| what is developer skill score | `/blog/what-is-developer-skill-score` | Informational |
| deviq, developer analytics platform (branded) | `/` | Navigational |

Rules: never target the same query with two pages; new pages only for genuinely
new intents with unique content.

## 4. Sitemap / robots

- Dynamic sitemap: `app/sitemap.ts` → `GET /sitemap.xml` (driven by `PUBLIC_PAGES`).
- Dynamic robots: `app/robots.ts` → `GET /robots.txt` (allows `/`, disallows
  `/api/`, `/auth/`, and SPA tool-state paths `/analyze`, `/compare`, `/practice`,
  `/chat`, `/profile`, `/settings`, `/history`, `/following`).
- Static mirrors for GitHub Pages hosting: `public/sitemap.xml`, `public/robots.txt`
  (kept in sync manually — update both when adding a page).
- SPA tool URLs (`/analyze`, `/compare`, …) are **rewritten to `/` by
  `middleware.ts`** and serve identical HTML, so they are deliberately excluded
  from the sitemap and disallowed in robots to avoid duplicate/thin indexing.

## 5. Canonical strategy

- Every indexable page sets `alternates.canonical` to its absolute HTTPS
  production URL with no query params (`https://www.deviq.online/<path>`).
- Share links (`?gh=&lc=&cf=`) are client-side only and never canonicalized or
  submitted anywhere.

## 6. Structured data

| Page | Schema |
|---|---|
| Global (`layout.tsx`) | `WebSite`, `Organization`, `SoftwareApplication` (price 0, real feature list) |
| Landing pages | `WebPage` + `BreadcrumbList` + `FAQPage` (matches visible FAQ) + `SoftwareApplication` |
| Blog posts | `Article` (+ `BreadcrumbList`; `FAQPage` only where a visible FAQ exists) |
| Blog index | `WebPage` + `BreadcrumbList` |

No fake reviews/ratings. FAQ schema text always matches the visible FAQ section.

## 7. Internal linking

```
Homepage (/)
 ├─ /developer-analytics (hub)
 │   ├─ /github-profile-analyzer
 │   ├─ /leetcode-profile-analyzer
 │   ├─ /codeforces-profile-analyzer
 │   └─ /developer-skill-score
 └─ /blog (hub)
     ├─ /blog/how-to-analyze-github-profile
     ├─ /blog/how-to-track-leetcode-progress
     └─ /blog/what-is-developer-skill-score
```

- Every landing/blog page has breadcrumbs, contextual `RelatedPages` links, and a
  `ToolCta` linking to the interactive tool (`/analyze`, `/compare`).
- Anchor text is descriptive (no "click here").

## 8. Noindex / private routes

- `app/not-found.tsx` — `robots: noindex, nofollow`, correct 404 status.
- `middleware.ts` adds `X-Robots-Tag: noindex, nofollow` to all `/auth/*`
  (OAuth callbacks are transient redirect pages; also `Disallow: /auth/`).
- `/api/*` never appears in sitemap/robots-allow; auth/profile/history/following/
  chat/practice/compare/analyze tool states are disallowed (JS-gated, user data).
- `app/[...slug]/page.tsx` returns `notFound()` (proper 404) for any slug that is
  not a known single-segment SPA tool route. Static SEO routes take precedence
  over the catch-all automatically.

## 9. Google Search Console setup

1. Add property `https://www.deviq.online/` (URL prefix or domain).
2. Verify via meta tag: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` env var to the
   token (picked up automatically by `layout.tsx` → no hard-coded secrets).
   Same for Bing via `NEXT_PUBLIC_BING_SITE_VERIFICATION`.
3. Submit sitemap: `https://www.deviq.online/sitemap.xml`.
4. Request indexing for `/` + the 5 landing pages + `/blog`.
5. Monitor Coverage (soft-404s should be ~zero), Enhancements (FAQ/Article), and
   Core Web Vitals.

## 10. Recommended future content (only if genuinely useful)

- `What Is a Developer Skill Score`-style explainers: "GitHub vs LeetCode stats",
  "How Developer Analytics Helps Track Coding Progress".
- Company-tagged interview prep guides backed by real product data.
- Changelog/release notes if shipped regularly (freshness signal).
- Multilingual pages only with real translations (no auto-generated spam).

Off-page (not in repo): backlinks from dev communities, social profiles, and
directories; analytics (Plausible/GA) to measure query → signup conversion.

## 11. SEO testing commands

```bash
npm run build            # must pass; also prerenders all SEO routes
npx tsc --noEmit         # TypeScript check
npm run dev              # then verify:
# http://localhost:3000/sitemap.xml   — 10 URLs, absolute https locs
# http://localhost:3000/robots.txt    — Allow / + disallows + sitemap line
# View-source on each landing/blog page: exactly one <h1>, canonical,
#   og:*, twitter:*, and application/ld+json blocks
# Google Rich Results Test on landing URLs for FAQ/Article/SoftwareApplication
# PageSpeed Insights on / and one landing page (LCP/INP/CLS)
```
