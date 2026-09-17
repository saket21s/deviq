import {
  buildMetadata,
  webPageJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  softwareAppJsonLd,
  type FaqItem,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs, FaqSection, ToolCta, RelatedPages } from "@/components/seo";

export const metadata = buildMetadata({
  title: "GitHub Profile Analyzer — Repos, Stars, Languages & Skill Score",
  description:
    "Analyze any GitHub profile in seconds: repository stats, stars, language distribution, contribution heatmaps, streaks, and a unified developer skill score. Free, no signup required to try.",
  path: "/github-profile-analyzer",
  keywords: [
    "github profile analyzer",
    "github profile analytics",
    "github stats",
    "github language distribution",
    "github contribution heatmap",
    "developer github analysis",
  ],
});

const FAQS: FaqItem[] = [
  {
    question: "What does the GitHub profile analyzer measure?",
    answer:
      "It measures public repository count, total stars, recent project activity, language distribution across your repos, contribution heatmap totals, current and longest streaks, and a derived GitHub skill score that feeds into your overall DevIQ score.",
  },
  {
    question: "Do I need to sign in or connect my GitHub account?",
    answer:
      "No. Enter any public GitHub username to run a read-only analysis of public data. Signing in is only needed to save history, follow developers, or sync a persistent profile.",
  },
  {
    question: "How is the GitHub skill score calculated?",
    answer:
      "The score weighs repository count, stars earned, recent activity, language breadth, and contribution consistency. It is one of three inputs — alongside LeetCode and Codeforces — that combine into your unified DevIQ score.",
  },
  {
    question: "Can I analyze someone else's GitHub profile?",
    answer:
      "Yes, any public GitHub username works. You can also compare two developers side by side with the head-to-head comparison tool.",
  },
  {
    question: "Is the GitHub analyzer free?",
    answer:
      "Yes, analyzing public GitHub profiles is completely free with no signup required to try.",
  },
];

export default function GitHubProfileAnalyzerPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "GitHub Profile Analyzer",
            description: metadata.description as string,
            path: "/github-profile-analyzer",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "GitHub Profile Analyzer", path: "/github-profile-analyzer" },
          ]),
          faqJsonLd(FAQS),
          softwareAppJsonLd(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "GitHub Profile Analyzer", path: "/github-profile-analyzer" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        GitHub Profile Analyzer
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
        Turn any GitHub username into a clear, honest picture of engineering output.
        DevIQ reads public repository data — projects, stars, languages, and contribution
        history — and summarizes it as stats, charts, and a single GitHub skill score.
      </p>

      <section aria-labelledby="what-you-get" className="mt-10">
        <h2 id="what-you-get" className="text-2xl font-semibold tracking-tight mb-4">
          What you get from a GitHub analysis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Repository overview", "Total projects, recent projects, stars earned, and your most-used language at a glance."],
            ["Language distribution", "See exactly which languages dominate your work across all public repos."],
            ["Contribution heatmap", "Year-long activity grid with totals, busiest day, and streak tracking."],
            ["Streaks & consistency", "Current streak, longest streak, and monthly comparisons against last year."],
            ["Top repositories", "Your most-starred and most-active repos, ranked with descriptions and topics."],
            ["Role-fit signals", "Repo languages and topics feed role detection across 12 engineering roles."],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <h3 className="font-medium">{h}</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="mt-10">
        <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight mb-4">
          How it works
        </h2>
        <ol className="list-decimal ml-6 space-y-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Enter any public GitHub username in the analyzer.</li>
          <li>DevIQ fetches public repos, stars, languages, and contribution activity.</li>
          <li>Review your dashboard: stats, heatmap, language bars, and skill score.</li>
          <li>Combine with LeetCode and Codeforces for a unified DevIQ score.</li>
        </ol>
      </section>

      <section aria-labelledby="who-for" className="mt-10">
        <h2 id="who-for" className="text-2xl font-semibold tracking-tight mb-4">
          Who it is for
        </h2>
        <ul className="list-disc ml-6 space-y-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li><strong>Job seekers</strong> checking how their public profile reads to recruiters.</li>
          <li><strong>Students</strong> tracking open-source consistency over semesters.</li>
          <li><strong>Hiring managers</strong> getting a quick, data-first first impression.</li>
          <li><strong>Teams</strong> comparing contributor profiles side by side.</li>
        </ul>
      </section>

      <ToolCta
        title="Analyze a GitHub profile now"
        body="Enter a GitHub username and get repos, stars, languages, heatmaps, and a skill score in seconds. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Analyze GitHub profile"
      />

      <FaqSection faqs={FAQS} />

      <RelatedPages
        links={[
          { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "Track problems solved by difficulty, ranking, and contest rating." },
          { href: "/codeforces-profile-analyzer", title: "Codeforces Profile Analyzer", desc: "Follow rating, rank, and contests over time." },
          { href: "/developer-skill-score", title: "Developer Skill Score", desc: "How GitHub, LeetCode, and Codeforces combine into one score." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "The full analytics dashboard across every platform." },
        ]}
      />
    </main>
  );
}
