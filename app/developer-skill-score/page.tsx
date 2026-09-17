import {
  buildMetadata,
  webPageJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  type FaqItem,
} from "@/lib/seo";
import { JsonLd, Breadcrumbs, FaqSection, ToolCta, RelatedPages } from "@/components/seo";

export const metadata = buildMetadata({
  title: "Developer Skill Score — How Your DevIQ Score Is Calculated",
  description:
    "Understand the DevIQ developer skill score: how GitHub activity, LeetCode problem-solving, and Codeforces rating combine into one 0–100 score, what each tier means, and how to raise yours.",
  path: "/developer-skill-score",
  keywords: [
    "developer skill score",
    "dev score calculator",
    "coding score",
    "developer rating",
    "programming profile score",
    "developer iq score",
  ],
});

const FAQS: FaqItem[] = [
  {
    question: "What is the DevIQ skill score?",
    answer:
      "A 0–100 number summarizing your public developer footprint across GitHub, LeetCode, and Codeforces, paired with a tier (Beginner, Junior, Mid, Senior, Elite) and a plain-language verdict.",
  },
  {
    question: "How is the score calculated?",
    answer:
      "It is a weighted combination of GitHub activity (repositories, stars, contributions, recency), LeetCode problem-solving (total solves split by easy, medium, and hard), and Codeforces competitive programming rating. Each platform contributes according to the data available — you can run it with one, two, or all three usernames.",
  },
  {
    question: "What do the score tiers mean?",
    answer:
      "85+ is Elite, 70+ Senior, 55+ Mid, 35+ Junior, and below 35 Beginner. Tiers describe the current public footprint, not your worth — they move as you ship, solve, and compete.",
  },
  {
    question: "How can I raise my DevIQ score?",
    answer:
      "Ship consistently on GitHub (repos with stars and recent activity), solve harder LeetCode problems across more topics, and compete regularly on Codeforces. Your AI improvement plan prioritizes whichever lever moves your score most.",
  },
  {
    question: "Is the score free to check?",
    answer: "Yes — enter your usernames and get your score instantly, free, with no signup required to try.",
  },
];

export default function DeveloperSkillScorePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <JsonLd
        data={[
          webPageJsonLd({
            title: "Developer Skill Score",
            description: metadata.description as string,
            path: "/developer-skill-score",
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Developer Skill Score", path: "/developer-skill-score" },
          ]),
          faqJsonLd(FAQS),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Developer Skill Score", path: "/developer-skill-score" },
        ]}
      />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Developer Skill Score
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-600 dark:text-neutral-300">
        One number for your whole developer footprint. The DevIQ score blends your GitHub
        output, LeetCode problem-solving, and Codeforces rating into a single 0–100 score
        — transparent, re-runnable, and tied to concrete next steps.
      </p>

      <section aria-labelledby="inputs" className="mt-10">
        <h2 id="inputs" className="text-2xl font-semibold tracking-tight mb-4">
          What goes into the score
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["GitHub", "Repositories, stars, recent activity, language breadth, and contribution consistency."],
            ["LeetCode", "Total solves weighted toward medium and hard problems, plus ranking and contests."],
            ["Codeforces", "Rating and contest participation as a measure of algorithmic depth."],
          ].map(([h, p]) => (
            <div key={h} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
              <h3 className="font-medium">{h}</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] text-neutral-600 dark:text-neutral-400">
          Provide one, two, or all three usernames — the score adapts to whatever data is
          available, and gets most accurate when all three are present.
        </p>
      </section>

      <section aria-labelledby="tiers" className="mt-10">
        <h2 id="tiers" className="text-2xl font-semibold tracking-tight mb-4">
          Score tiers
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                <th scope="col" className="px-4 py-3 font-medium">Score</th>
                <th scope="col" className="px-4 py-3 font-medium">Tier</th>
                <th scope="col" className="px-4 py-3 font-medium">What it signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {[
                ["85–100", "Elite", "Exceptional, consistent output with competitive depth."],
                ["70–84", "Senior", "Strong and consistent across every platform."],
                ["55–69", "Mid", "Solid foundation with real breadth; actively leveling up."],
                ["35–54", "Junior", "Early career with genuine momentum."],
                ["0–34", "Beginner", "Just getting started — every expert began here."],
              ].map(([s, t, d]) => (
                <tr key={s}>
                  <td className="px-4 py-3 font-medium tabular-nums">{s}</td>
                  <td className="px-4 py-3">{t}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="raise" className="mt-10">
        <h2 id="raise" className="text-2xl font-semibold tracking-tight mb-4">
          How to raise your score
        </h2>
        <ol className="list-decimal ml-6 space-y-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          <li>Run your analysis to find your weakest of the three inputs.</li>
          <li>Follow the AI improvement plan — it ranks actions by score impact.</li>
          <li>Ship small, starred GitHub work steadily rather than in bursts.</li>
          <li>Shift LeetCode practice toward mediums and hards in weak topics.</li>
          <li>Enter Codeforces rounds regularly; participation compounds.</li>
          <li>Re-run monthly and compare history to confirm the trend.</li>
        </ol>
      </section>

      <ToolCta
        title="Check your skill score"
        body="Enter your GitHub, LeetCode, or Codeforces username and get your 0–100 score with a full breakdown. Free, no signup required to try."
        primaryHref="/analyze"
        primaryLabel="Calculate my score"
      />

      <FaqSection faqs={FAQS} />

      <RelatedPages
        links={[
          { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "How your repos and stars feed the score." },
          { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "How solves by difficulty feed the score." },
          { href: "/developer-analytics", title: "Developer Analytics", desc: "The full dashboard behind the score." },
          { href: "/blog/what-is-developer-skill-score", title: "What Is a Developer Skill Score?", desc: "A deeper explainer on scoring philosophy." },
        ]}
      />
    </main>
  );
}
