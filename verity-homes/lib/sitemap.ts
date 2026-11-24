// Pure sitemap/robots helpers (Unit 20), unit-tested in tests/unit/seo.test.ts.

/** Public pages that always exist. Detail pages come from the database. */
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/properties",
  "/invest",
  "/about",
  "/blog",
  "/contact",
  "/privacy",
] as const;

export type SitemapEntry = { url: string; lastModified?: Date };

export function sitemapEntries(
  staticPaths: readonly string[],
  rows: readonly { path: string; lastModified: Date }[],
  siteUrl: string,
): SitemapEntry[] {
  const abs = (path: string) => new URL(path, siteUrl).toString();
  return [
    ...staticPaths.map((path) => ({ url: abs(path) })),
    ...rows.map((r) => ({ url: abs(r.path), lastModified: r.lastModified })),
  ];
}

/**
 * robots.txt rules. Only the production deployment (`VERCEL_ENV === "production"`, the live
 * domain) is crawlable, and never the admin panel, APIs or sign-in. Everything else — preview
 * deploys, `*-git-main-*` URLs, local dev — disallows everything, so no copy of the site is
 * indexed under another host.
 */
export function robotsRules(siteUrl: string, vercelEnv: string | undefined) {
  if (vercelEnv !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/sign-in"] }],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: new URL(siteUrl).origin,
  };
}
