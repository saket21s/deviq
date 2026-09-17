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
  title: "Developer Analytics Dashboard — GitHub, LeetCode & Codeforces in One Place",
  description:
    "DevIQ is a free developer analytics dashboard combining GitHub, LeetCode, and Codeforces into one view: unified score, AI insights, role-fit analysis, heatmaps, comparisons, and practice plans.",
  path: "/developer-analytics",
  keywords: [
    "developer analytics dashboard",
    "developer productivity analytics",
    "coding statistics dashboard",
    "developer profile analytics",
    "software engineer analytics",
    "coding dashboard",
  ],
});

const FAQS: FaqItem[] = [
  {
    question: "What is a developer analytics dashboard?",
    answer:
      "It is a single view that aggregates your coding activity — repositories and contributions, problem-solving stats, and contest ratings — into charts, scores, and actionable insights instead of scattered profile pages.",
  },
  {
    question: "Which platforms does DevIQ analytics cover?",
    answer:
      "GitHub (repos, stars, languages, contributions), LeetCode (solves by difficulty, ranking, contests), and Codeforces (rating, rank, contests). All three combine into one unified score.",
  },
  {
    question: "What insights does the dashboard provide beyond raw stats?",
    answer:
      "AI-powered strengths and improvement plans, role-fit analysis across 12 engineering roles, head-to-head developer comparison, contribution streaks and gaps, coding-hour patterns, and personalized practice recommendations.",
  },
  {
    question: "Is DevIQ free?",
    answer:
      "Yes. Running analyses across GitHub, LeetCode, and Codeforces is free, with no signup required to try.",
  },
  {
    question: "Do I need to connect my accounts?",
    answer:
      "No connection is needed for a first analysis — public usernames are enough. Signing in unlocks history, following, and a persistent profile.",
  },
];

export default function DeveloperAnalyticsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "Developer Analytics Dashboard",
            description: metadata.description as string,
            path: "/developer-analytics",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Developer Analytics", path: "/developer-analytics" },
          ]),
          faqJsonLd(FAQS),
          softwareAppJsonLd(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Developer Analytics", path: "/developer-analytics" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Developer Analytics Dashboard
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
        Your coding life is scattered across GitHub, LeetCode, and Codeforces. DevIQ pulls
        it together into one dashboard — a unified score, visual stats, AI insights, and a
        plan for what to improve next.
      </p>

      <section aria-labelledby="features" className="mt-10">
        <h2 id="features" className="text-2xl font-semibold tracking-tight mb-4">
          Everything in one dashboard
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Unified dev score", "One 0–100 score blending GitHub, LeetCode, and Codeforces — with a plain-language verdict."],
            ["Platform breakdowns", "Dedicated GitHub, LeetCode, and Codeforces cards with the metrics that matter."],
            ["AI insights", "Strengths, gaps, and a personalized improvement plan generated from your real data."],
            ["Role-fit analysis", "See which of 12 engineering roles your profile fits best — frontend to ML to DevOps."],
            ["Head-to-head compare", "Two developers, every metric, side by side."],
            ["Heatmaps & streaks", "Contribution history with streaks, gaps, and year-over-year growth."],
            ["Practice engine", "Weak-topic detection plus company-tagged problems and daily recommendations."],
            ["Shareable cards", "Exportable profile summaries to share progress anywhere."],
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
          <li>Enter your GitHub, LeetCode, or Codeforces usernames — any combination.</li>
          <li>DevIQ analyzes public data across all three platforms in seconds.</li>
          <li>Explore your score, charts, role fit, and AI insights.</li>
          <li>Follow the improvement plan, practice, and re-run to watch your score move.</li>
        </ol>
      </section>

      <section aria-labelledby="use-cases" className="mt-10">
        <h2 id="use-cases" className="text-2xl font-semibold tracking-tight mb-4">
          Practical uses
        </h2>
        <ul className="list-disc ml-6 space-y-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li><strong>Portfolio reviews:</strong> see your public footprint the way recruiters do.</li>
          <li><strong>Interview prep:</strong> focus DSA practice on measured weak topics.</li>
          <li><strong>Habit building:</strong> streaks and history keep consistency visible.</li>
          <li><strong>Team benchmarking:</strong> compare profiles fairly across the same metrics.</li>
        </ul>
      </section>

      <ToolCta
        title="Open your analytics dashboard"
        body="Enter your usernames and get your unified score, charts, and AI insights in seconds. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Run my analysis"
      />

      <FaqSection faqs={FAQS} />

      <RelatedPages
        links={[
          { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "Repos, stars, languages, and heatmaps." },
          { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "Solves, ranking, and contests." },
          { href: "/codeforces-profile-analyzer", title: "Codeforces Profile Analyzer", desc: "Rating, rank, and contest history." },
          { href: "/developer-skill-score", title: "Developer Skill Score", desc: "How the unified 0–100 score is calculated." },
        ]}
      />
    </main>
  );
}
