import Link from "next/link";
import {
  buildMetadata,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  type FaqItem,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs, FaqSection, ToolCta, RelatedPages } from "@/components/seo";

const PATH = "/blog/what-is-developer-skill-score";
const PUBLISHED = "2026-03-15";

export const metadata = buildMetadata({
  title: "What Is a Developer Skill Score — and Should You Trust One?",
  description:
    "Composite developer scores explained: what DevIQ's 0–100 skill score measures across GitHub, LeetCode, and Codeforces, where it falls short, and how to use it honestly.",
  path: PATH,
  keywords: ["what is developer skill score", "developer score explained", "deviq score", "coding score accuracy"],
  type: "article",
  publishedTime: PUBLISHED,
});

const FAQS: FaqItem[] = [
  {
    question: "Is a developer skill score an official credential?",
    answer:
      "No. It is an informal summary of public activity, not a certification. Use it for self-tracking and first impressions — never as the sole hiring signal.",
  },
  {
    question: "Can a skill score be gamed?",
    answer:
      "Any metric based on public activity can be inflated with low-value commits or cherry-picked solves. Scores are most meaningful as personal trend lines over months, where gaming is obvious and pointless.",
  },
  {
    question: "What does the DevIQ score not measure?",
    answer:
      "Code quality, system design judgment, communication, teamwork, private or workplace code, and years of experience. It summarizes public footprint only.",
  },
];

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
            { name: "What Is a Developer Skill Score?", path: PATH },
          ]),
          faqJsonLd(FAQS),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: "What Is a Developer Skill Score?", path: PATH },
        ]}
      />
      <article>
        <h1 className="text-4xl font-semibold tracking-tight">
          What Is a Developer Skill Score — and Should You Trust One?
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          <time dateTime={PUBLISHED}>March 15, 2026</time> · 4 min read · By DevIQ
        </p>
        <p className="mt-6 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
          A developer skill score compresses scattered public activity into one number.
          Useful — if you know what it captures and what it ignores. Here is an honest
          breakdown using <Link href="/developer-skill-score" className="underline underline-offset-4">DevIQ&apos;s 0–100 score</Link> as
          the example.
        </p>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">What the score measures</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Three public inputs: GitHub activity (repos, stars, recency, contributions),
          LeetCode problem-solving (volume weighted toward harder problems), and Codeforces
          rating (algorithmic depth under time pressure). Together they approximate three
          things employers care about: shipping, problem-solving, and CS fundamentals.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">What it deliberately does not measure</h2>
        <ul className="mt-3 ml-6 list-disc space-y-2 leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Private workplace code — often a developer&apos;s best work, invisible by design.</li>
          <li>Code quality, architecture judgment, and review culture.</li>
          <li>Communication, mentorship, and reliability on a team.</li>
          <li>Experience depth in domains like security or distributed systems.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">How to use a score well</h2>
        <ol className="mt-3 ml-6 list-decimal space-y-2 leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Treat it as a trend line: re-run monthly and watch direction, not digits.</li>
          <li>Drill into the breakdown — the value is in knowing which input lags.</li>
          <li>Pair it with qualitative proof: READMEs, write-ups, and project stories.</li>
          <li>Never optimize the number directly; optimize the habits and let it follow.</li>
        </ol>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">The limits, stated plainly</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Scores reward public activity, so developers doing great private work score lower
          than they deserve. Hiring decisions should always combine scores with interviews,
          work samples, and references. A score opens the conversation — it should never
          close it.
        </p>
      </article>

      <FaqSection faqs={FAQS} />

      <ToolCta
        title="Check your own score"
        body="See your 0–100 developer skill score with a full platform breakdown. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Calculate my score"
      />

      <RelatedPages
        links={[
          { href: "/developer-skill-score", title: "Developer Skill Score", desc: "Inputs, tiers, and how to raise yours." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "The dashboard behind the score." },
          { href: "/blog/how-to-analyze-github-profile", title: "How to Analyze Your GitHub Profile", desc: "Audit your largest score input." },
          { href: "/blog/how-to-track-leetcode-progress", title: "How to Track LeetCode Progress", desc: "Improve your problem-solving input." },
        ]}
      />
    </main>
  );
}
