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
  title: "Codeforces Profile Analyzer — Rating, Rank & Contest History",
  description:
    "Analyze any Codeforces handle: current rating, max rating, rank, problems solved, contests participated, and recent solves. Combine it with GitHub and LeetCode into one DevIQ score. Free to try.",
  path: "/codeforces-profile-analyzer",
  keywords: [
    "codeforces profile analyzer",
    "codeforces rating tracker",
    "codeforces analytics",
    "codeforces rank",
    "competitive programming stats",
    "codeforces rating history",
  ],
});

const FAQS: FaqItem[] = [
  {
    question: "What Codeforces stats does the analyzer show?",
    answer:
      "Current and max rating, current and max rank (such as Pupil, Specialist, Expert, or Master), problems solved, contests participated, contribution, and recently solved problems with ratings and links.",
  },
  {
    question: "Do I need to connect my Codeforces account?",
    answer:
      "No. Enter any public Codeforces handle — analysis is read-only and needs no login or API key.",
  },
  {
    question: "How does Codeforces affect my DevIQ score?",
    answer:
      "Competitive programming rating and contest participation feed the unified DevIQ score alongside GitHub and LeetCode, rewarding algorithmic depth.",
  },
  {
    question: "Can I compare two Codeforces profiles?",
    answer:
      "Yes. Run two analyses and use head-to-head comparison to contrast ratings, ranks, problems solved, and contest counts side by side.",
  },
  {
    question: "Is the Codeforces analyzer free?",
    answer: "Yes, analyzing public Codeforces handles is free with no signup required to try.",
  },
];

export default function CodeforcesProfileAnalyzerPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "Codeforces Profile Analyzer",
            description: metadata.description as string,
            path: "/codeforces-profile-analyzer",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Codeforces Profile Analyzer", path: "/codeforces-profile-analyzer" },
          ]),
          faqJsonLd(FAQS),
          softwareAppJsonLd(),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Codeforces Profile Analyzer", path: "/codeforces-profile-analyzer" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Codeforces Profile Analyzer
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
        Competitive programming progress, made legible. Enter a Codeforces handle and see
        rating, rank progression, contests, and solved problems — all feeding your
        unified developer score.
      </p>

      <section aria-labelledby="what-you-get" className="mt-10">
        <h2 id="what-you-get" className="text-2xl font-semibold tracking-tight mb-4">
          What you get from a Codeforces analysis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Rating & max rating", "Current rating with your all-time peak for context."],
            ["Rank progression", "From Newbie to Grandmaster — current and max rank displayed."],
            ["Contests participated", "How many rated contests back your rating."],
            ["Problems solved", "Total accepted problems across contests and practice."],
            ["Recent solves", "Latest solved problems with difficulty ratings and links."],
            ["Unified score impact", "Your CP strength reflected in the overall DevIQ score."],
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
          <li>Enter any public Codeforces handle in the analyzer.</li>
          <li>DevIQ loads rating, rank, contests, and solved-problem history.</li>
          <li>Review your competitive profile and recent solves.</li>
          <li>Combine with GitHub and LeetCode for your unified DevIQ score.</li>
        </ol>
      </section>

      <ToolCta
        title="Analyze a Codeforces handle now"
        body="Enter a Codeforces handle and see rating, rank, contests, and solved problems in seconds. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Analyze Codeforces handle"
      />

      <FaqSection faqs={FAQS} />

      <RelatedPages
        links={[
          { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "Repos, stars, languages, and contribution heatmaps." },
          { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "Problems solved, ranking, and contest rating." },
          { href: "/developer-skill-score", title: "Developer Skill Score", desc: "How Codeforces rating feeds one unified score." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "The full cross-platform analytics dashboard." },
        ]}
      />
    </main>
  );
}
