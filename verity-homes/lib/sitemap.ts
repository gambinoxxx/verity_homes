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

/** robots.txt rules: everything public is crawlable; the admin panel and APIs are not. */
export function robotsRules(siteUrl: string) {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: new URL(siteUrl).origin,
  };
}
