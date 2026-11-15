/**
 * Fallback for the `[slug]` pages' <Suspense> (posts, properties, plans). With Partial
 * Prefetching each of those routes also has a generic App Shell in which `params` is unknown;
 * the URL-specific content renders inside the boundary (Next 16 "Move URL data behind
 * Suspense"). Prerendered slugs never show this; a new slug shows it until its page streams in.
 */
export function SlugPageFallback() {
  return (
    <div style={{ minHeight: "100vh" }} aria-busy="true">
      <span className="sr-only">Loading…</span>
    </div>
  );
}
