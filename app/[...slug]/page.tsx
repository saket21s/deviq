import { notFound } from "next/navigation";
import Page from "../page";

// Paths the client SPA can render as tool views (served via middleware
// rewrite to `/` on hosts with middleware, or via this catch-all on
// purely static hosts). Anything else is a genuine unknown URL.
const SPA_ROUTES = new Set([
  "analyze",
  "compare",
  "profile",
  "settings",
  "history",
  "following",
  "chat",
  "practice",
  "playground",
  "review",
]);

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  // Only single-segment SPA tool routes are valid here. Static SEO routes
  // (/github-profile-analyzer, /blog/..., etc.) take precedence over this
  // catch-all automatically. Everything else gets a proper 404 status.
  if (!slug || slug.length !== 1 || !SPA_ROUTES.has(slug[0])) {
    notFound();
  }
  return <Page />;
}
