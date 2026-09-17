import Link from "next/link";
import { absoluteUrl, type FaqItem } from "@/lib/seo";

/** Render one or more JSON-LD blocks. Server-component safe. */
export function JsonLd({ data }: { data: unknown | unknown[] }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}
    </>
  );
}

/** Accessible breadcrumb nav with internal links (also feeds BreadcrumbList schema). */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {last ? (
                <span aria-current="page" className="text-neutral-900 dark:text-neutral-100 font-medium">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="hover:underline underline-offset-4">
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** FAQ section — visible content must match FAQPage schema exactly. */
export function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-12">
      <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight mb-5">
        Frequently asked questions
      </h2>
      <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-y border-neutral-200 dark:border-neutral-800">
        {faqs.map((f) => (
          <details key={f.question} className="group py-4">
            <summary className="cursor-pointer font-medium text-[15px] list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              {f.question}
              <span aria-hidden="true" className="text-neutral-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-3xl">
              {f.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Primary call-to-action linking into the interactive tool (real internal link). */
export function ToolCta({
  title = "Analyze your developer profile now",
  body = "Enter your GitHub, LeetCode, or Codeforces username and get your unified DevIQ score in seconds. Free, no signup required to try.",
  primaryHref = "/analyze",
  primaryLabel = "Analyze my profile",
}: {
  title?: string;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section aria-label="Get started" className="mt-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-8 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-[15px] text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">{body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={primaryHref}
          className="inline-flex items-center rounded-lg bg-neutral-900 dark:bg-white px-6 py-3 text-sm font-semibold text-white dark:text-black hover:opacity-90"
        >
          {primaryLabel}
        </Link>
        <Link
          href="/compare"
          className="inline-flex items-center rounded-lg border border-neutral-300 dark:border-neutral-700 px-6 py-3 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Compare developers
        </Link>
      </div>
    </section>
  );
}

/** Contextual internal links between related SEO pages. */
export function RelatedPages({ links }: { links: { href: string; title: string; desc: string }[] }) {
  return (
    <section aria-labelledby="related-heading" className="mt-12">
      <h2 id="related-heading" className="text-2xl font-semibold tracking-tight mb-5">
        Related guides
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
          >
            <span className="font-medium text-[15px] underline-offset-4 hover:underline">{l.title}</span>
            <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-400">{l.desc}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Canonical link helper (Next Metadata handles the canonical tag; this is for docs/tests). */
export function canonicalFor(path: string): string {
  return absoluteUrl(path);
}
