import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist. Explore DevIQ's developer analytics tools instead.",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", title: "Home", desc: "Run a developer analysis." },
  { href: "/developer-analytics", title: "Developer Analytics", desc: "GitHub, LeetCode & Codeforces in one dashboard." },
  { href: "/github-profile-analyzer", title: "GitHub Profile Analyzer", desc: "Repos, stars, languages & heatmaps." },
  { href: "/leetcode-profile-analyzer", title: "LeetCode Profile Analyzer", desc: "Solves, ranking & contests." },
  { href: "/codeforces-profile-analyzer", title: "Codeforces Profile Analyzer", desc: "Rating, rank & contest history." },
  { href: "/blog", title: "Blog", desc: "Guides on developer analytics." },
];

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-300">
        The page you are looking for does not exist or was moved. Here are useful places to go instead:
      </p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            <span className="font-medium underline-offset-4 hover:underline">{l.title}</span>
            <span className="mt-0.5 block text-sm text-neutral-600 dark:text-neutral-400">{l.desc}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
