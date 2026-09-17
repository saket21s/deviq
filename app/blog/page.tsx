import Link from "next/link";
import {
  buildMetadata,
  webPageJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs } from "@/components/seo";

export const metadata = buildMetadata({
  title: "DevIQ Blog — Developer Analytics Guides & Coding Growth",
  description:
    "Practical guides on analyzing GitHub profiles, tracking LeetCode progress, understanding developer skill scores, and growing as a software engineer with data.",
  path: "/blog",
  keywords: ["developer blog", "github guides", "leetcode guides", "developer analytics", "coding growth"],
});

const POSTS = [
  {
    slug: "how-to-analyze-github-profile",
    title: "How to Analyze Your GitHub Profile (and What Recruiters Actually See)",
    desc: "Repos, stars, languages, heatmaps, and consistency — how to read your GitHub profile like a hiring manager and fix weak spots.",
    date: "2026-03-15",
  },
  {
    slug: "how-to-track-leetcode-progress",
    title: "How to Track LeetCode Progress Beyond Solved Count",
    desc: "Difficulty mix, topic coverage, contest rating, and weak-area detection — the metrics that show whether your DSA practice is working.",
    date: "2026-03-15",
  },
  {
    slug: "what-is-developer-skill-score",
    title: "What Is a Developer Skill Score — and Should You Trust One?",
    desc: "How composite developer scores work, what DevIQ's 0–100 score measures, its limits, and how to use it without gaming it.",
    date: "2026-03-15",
  },
];

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "DevIQ Blog",
            description: metadata.description as string,
            path: "/blog",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">DevIQ Blog</h1>
      <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
        Practical, data-first guides to understanding and improving your developer profile.
      </p>
      <div className="mt-8 grid gap-4">
        {POSTS.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              <time dateTime={p.date}>
                {new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </span>
            <span className="mt-1 block text-xl font-medium tracking-tight underline-offset-4 hover:underline">
              {p.title}
            </span>
            <span className="mt-2 block text-[15px] text-neutral-600 dark:text-neutral-400">{p.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
