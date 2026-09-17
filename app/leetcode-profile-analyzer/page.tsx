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
  title: "LeetCode Profile Analyzer — Problems Solved, Ranking & Contests",
  description:
    "Analyze any LeetCode profile: total problems solved by difficulty, ranking, contest rating, badges, and recent solves. Combine it with GitHub and Codeforces into one DevIQ score. Free to try.",
  path: "/leetcode-profile-analyzer",
  keywords: [
    "leetcode profile analyzer",
    "leetcode stats",
    "leetcode analytics",
    "leetcode progress tracker",
    "leetcode contest rating",
    "coding profile analyzer",
  ],
});

const FAQS: FaqItem[] = [
  {
    question: "What LeetCode stats does the analyzer show?",
    answer:
      "Total problems solved with easy, medium, and hard breakdowns, global ranking, contest rating and contests attended where available, badge counts, and a list of recently solved problems with links.",
  },
  {
    question: "Do I need my LeetCode password or login?",
    answer:
      "No. Analysis uses your public LeetCode username only — no password, no account connection. Just enter the username.",
  },
  {
    question: "How does LeetCode affect my DevIQ score?",
    answer:
      "Problem-solving volume and difficulty mix feed the unified DevIQ score alongside GitHub activity and Codeforces rating, so consistent DSA practice visibly moves your score.",
  },
  {
    question: "Can I track weak topics and get practice recommendations?",
    answer:
      "Yes. DevIQ identifies weak topic categories from your solve history and recommends what to solve next, including company-tagged problems for interview prep.",
  },
  {
    question: "Is the LeetCode analyzer free?",
    answer: "Yes, analyzing public LeetCode profiles is free with no signup required to try.",
  },
];

export default function LeetCodeProfileAnalyzerPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "LeetCode Profile Analyzer",
            description: metadata.description as string,
            path: "/leetcode-profile-analyzer",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "LeetCode Profile Analyzer", path: "/leetcode-profile-analyzer" },
          ]),
          faqJsonLd(FAQS),
          softwareAppJsonLd(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "LeetCode Profile Analyzer", path: "/leetcode-profile-analyzer" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        LeetCode Profile Analyzer
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
        Your LeetCode grind, quantified. Enter a username and see problems solved by
        difficulty, ranking, contest performance, and recent activity — then find out
        exactly what to solve next.
      </p>

      <section aria-labelledby="what-you-get" className="mt-10">
        <h2 id="what-you-get" className="text-2xl font-semibold tracking-tight mb-4">
          What you get from a LeetCode analysis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Solved by difficulty", "Easy, medium, and hard totals so your depth — not just volume — is visible."],
            ["Ranking & contests", "Global ranking, contest rating, contests attended, and top percentage."],
            ["Recent solves", "Your latest solved problems with direct links for review."],
            ["Weak-topic detection", "Topic categories where your accuracy lags, with counts per difficulty."],
            ["Smart recommendations", "A suggested next problem matched to your weak areas and history."],
            ["Company-tagged practice", "Problems grouped by hiring company to focus interview prep."],
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
          <li>Enter any public LeetCode username in the analyzer.</li>
          <li>DevIQ loads solve counts, ranking, contests, and recent solves.</li>
          <li>Review difficulty mix, weak categories, and practice suggestions.</li>
          <li>Combine with GitHub and Codeforces for your unified DevIQ score.</li>
        </ol>
      </section>

      <section aria-labelledby="who-for" className="mt-10">
        <h2 id="who-for" className="text-2xl font-semibold tracking-tight mb-4">
          Who it is for
        </h2>
        <ul className="list-disc ml-6 space-y-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li><strong>Interview candidates</strong> measuring DSA readiness by difficulty mix.</li>
          <li><strong>Students</strong> building a consistent daily-solving habit.</li>
          <li><strong>Contest participants</strong> tracking rating progress over time.</li>
          <li><strong>Mentors</strong> reviewing a mentee&apos;s topic coverage at a glance.</li>
        </ul>
      </section>

      <ToolCta
        title="Analyze a LeetCode profile now"
        body="Enter a LeetCode username and see solved counts, ranking, contests, and what to practice next. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Analyze LeetCode profile"
      />

      <FaqSection faqs={FAQS} />

      <RelatedPages
        links={[
          { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "Repos, stars, languages, and contribution heatmaps." },
          { href: "/codeforces-profile-analyzer", title: "Codeforces Profile Analyzer", desc: "Rating, rank, and competitive programming history." },
          { href: "/developer-skill-score", title: "Developer Skill Score", desc: "How your LeetCode stats combine into one score." },
          { href: "/blog/how-to-track-leetcode-progress", title: "How to Track LeetCode Progress", desc: "A practical guide to measuring DSA improvement." },
        ]}
      />
    </main>
  );
}
