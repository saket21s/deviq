import Link from "next/link";
import {
  buildMetadata,
  articleJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs, ToolCta, RelatedPages } from "@/components/seo";

const PATH = "/blog/how-to-analyze-github-profile";
const PUBLISHED = "2026-03-15";

export const metadata = buildMetadata({
  title: "How to Analyze Your GitHub Profile (and What Recruiters Actually See)",
  description:
    "Learn to read your GitHub profile like a hiring manager: repos, stars, language mix, contribution consistency, and the fixes that matter most — with DevIQ's free analyzer.",
  path: PATH,
  keywords: ["how to analyze github profile", "github profile review", "github for recruiters", "improve github profile"],
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
            { name: "How to Analyze Your GitHub Profile", path: PATH },
          ]),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: "How to Analyze Your GitHub Profile", path: PATH },
        ]}
      />
      <article>
        <h1 className="text-4xl font-semibold tracking-tight">
          How to Analyze Your GitHub Profile (and What Recruiters Actually See)
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          <time dateTime={PUBLISHED}>March 15, 2026</time> · 5 min read · By DevIQ
        </p>
        <p className="mt-6 text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
          Your GitHub profile is often the first thing a recruiter or hiring manager opens.
          Here is how to audit it honestly — the same way an analytics tool reads it — and
          which fixes actually move the needle.
        </p>

        <h2 className="mt-10 text-2xl font-semibold tracking-tight">1. Start with the signal, not the vanity metrics</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Follower counts and profile views feel good but say little. The metrics reviewers
          weigh are: number of maintained repositories, stars earned from others, recency of
          pushes, and whether READMEs explain what each project does. Run your username
          through a <Link href="/github-profile-analyzer" className="underline underline-offset-4">GitHub profile analyzer</Link> to
          see these numbers without bias.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">2. Check your language distribution</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          A healthy profile shows depth in one or two primary languages plus supporting
          breadth. If your chart is 90% tutorial forks in five languages, consolidate:
          archive forks, pin your best original work, and let your main stack dominate.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">3. Read your contribution heatmap critically</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Reviewers look for sustained activity, not bursts. Long gaps raise questions;
          steady greens suggest reliability. You do not need to code every day — but a
          visible multi-month rhythm beats a dead profile with one viral repo. Streaks and
          monthly comparisons make this easy to verify.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">4. Audit your top repositories</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Open your five most-starred repos and ask: does each have a README, a clear
          description, topics, and recent commits? A pinned set of three to six polished
          projects outperforms thirty half-finished ones.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">5. Check role-fit signals</h2>
        <p className="mt-3 leading-relaxed text-neutral-700 dark:text-neutral-300">
          Your languages, topics, and repo mix implicitly advertise a role. If you want
          backend work but your profile screams tutorial HTML, realign: build and pin two
          backend projects and let role-fit analysis confirm the shift. See how this feeds
          your overall <Link href="/developer-skill-score" className="underline underline-offset-4">developer skill score</Link>.
        </p>

        <h2 className="mt-8 text-2xl font-semibold tracking-tight">A 30-minute audit checklist</h2>
        <ul className="mt-3 ml-6 list-disc space-y-2 leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Run the analyzer; note repos, stars, top language, and streak.</li>
          <li>Unpin or archive forks and dead experiments.</li>
          <li>Write or refresh READMEs on your top five repos.</li>
          <li>Pin three to six projects matching your target role.</li>
          <li>Make one meaningful commit — then re-run and compare.</li>
        </ul>
      </article>

      <ToolCta
        title="Audit your GitHub profile now"
        body="Get repos, stars, languages, heatmaps, and a skill score for any GitHub username in seconds. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Analyze my GitHub"
      />

      <RelatedPages
        links={[
          { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "The free tool behind this audit." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "Combine GitHub with LeetCode and Codeforces." },
          { href: "/blog/how-to-track-leetcode-progress", title: "How to Track LeetCode Progress", desc: "Measure DSA practice beyond solved count." },
          { href: "/blog/what-is-developer-skill-score", title: "What Is a Developer Skill Score?", desc: "How composite scores work — and their limits." },
        ]}
      />
    </main>
  );
}
