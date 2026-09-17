import Link from "next/link";
import {
  buildMetadata,
  articleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs, ToolCta, RelatedPages } from "@/components/seo";

const PATH = "/blog/how-to-track-leetcode-progress";
const PUBLISHED = "2026-03-15";

export const metadata = buildMetadata({
  title: "How to Track LeetCode Progress Beyond Solved Count",
  description:
    "Solved count lies. Track difficulty mix, topic coverage, contest rating, and weak areas to know if your LeetCode practice is actually working — with DevIQ's free analyzer.",
  path: PATH,
  keywords: ["how to track leetcode progress", "leetcode progress tracker", "leetcode difficulty mix", "leetcode weak topics", "leetcode contest rating"],
  type: "article",
  publishedTime: PUBLISHED,
});

export default function PostPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <JsonLd
        data={[
          articleJsonLd({
            headline: metadata.title as string,
            description: metadata.description as string,
            path: PATH,
            publishedTime: PUBLISHED,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: "How to Track LeetCode Progress", path: PATH },
          ]),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: "How to Track LeetCode Progress", path: PATH },
        ]}
      />
      <article>
        <h1 className="text-4xl font-semibold tracking-tight">
          How to Track LeetCode Progress Beyond Solved Count
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          <time dateTime={PUBLISHED}>March 15, 2026</time> · 5 min read · By DevIQ
        </p>
        <p className="mt-6 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
          Two developers with 300 solves can be worlds apart: one solved 280 easies, the
          other cleared 150 mediums and 40 hards across every topic. Here are the metrics
          that reveal whether your practice is compounding.
        </p>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">1. Difficulty mix beats total solves</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Track your easy / medium / hard split monthly. A healthy trajectory shows mediums
          growing as a share and hards appearing regularly. If easies keep dominating after
          months of practice, raise your floor: attempt one medium daily before any easy.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">2. Map topic coverage, then attack gaps</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Most plateaus are topic gaps — dynamic programming, graphs, or sliding window —
          hiding inside a big total. A <Link href="/leetcode-profile-analyzer" className="underline underline-offset-4">LeetCode profile analyzer</Link> with
          weak-category detection shows accuracy per topic so you can aim practice where it
          hurts most.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">3. Use contest rating as your honest mirror</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Practice stats can be gamed by cherry-picking; timed contest rating cannot.
          Compete weekly and watch the trend line over eight to twelve weeks. Flat rating
          with rising solves means you are rehearsing, not learning.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">4. Review recent solves for retention</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Scroll your recent solves and re-attempt three from a month ago without hints. If
          you cannot reproduce the approach, the knowledge never stuck — schedule spaced
          revision of patterns, not just new problems.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">5. Tie practice to a target</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Company-tagged problem sets turn vague grinding into interview readiness: pick
          two target employers, work their frequent mediums, and track completion. Your
          practice data also feeds your <Link href="/developer-skill-score" className="underline underline-offset-4">developer skill score</Link>, so
          progress is visible in one number.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">Monthly review checklist</h2>
        <ul className="mt-3 ml-6 list-disc space-y-2 leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Record easy / medium / hard totals and compare to last month.</li>
          <li>List your three weakest topics and schedule focused sets.</li>
          <li>Log contest rating trend — up, flat, or down?</li>
          <li>Re-solve five old problems cold to test retention.</li>
          <li>Set next month&apos;s target: one topic + one rating milestone.</li>
        </ul>
      </article>

      <ToolCta
        title="Check your LeetCode stats now"
        body="See solves by difficulty, ranking, contests, and weak topics for any LeetCode username. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Analyze my LeetCode"
      />

      <RelatedPages
        links={[
          { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "The free tool behind these metrics." },
          { href: "/blog/how-to-analyze-github-profile", title: "How to Analyze Your GitHub Profile", desc: "Audit the other half of your footprint." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "One dashboard for LeetCode, GitHub, and Codeforces." },
          { href: "/blog/what-is-developer-skill-score", title: "What Is a Developer Skill Score?", desc: "How practice progress becomes one score." },
        ]}
      />
    </main>
  );
}
