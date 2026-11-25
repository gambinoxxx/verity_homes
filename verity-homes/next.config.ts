import type { NextConfig } from "next";

/**
 * Content-Security-Policy, limited to directives that cannot break Next's own inline scripts
 * and styles (no script-src / style-src until nonces are set up):
 * - frame-src: only our own pages and the Google Maps embed (property and contact maps,
 *   lib/maps.ts builds www.google.com URLs; Google may answer from maps.google.com).
 * - frame-ancestors: nobody else may frame the site (clickjacking).
 * - object-src / base-uri: no plugins, no <base> hijacking.
 * There is no img-src / connect-src yet, so Blob photos, the admin map's OpenStreetMap tiles and
 * Blob uploads need no CSP entry (Unit 15). Add them here if those directives are introduced.
 */
const CSP = [
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

// Dev only: GitHub Codespaces forwards the port as https://<name>-3000.app.github.dev, so the
// browser's Origin is that host while x-forwarded-host / Host may be localhost:3000. Next then
// rejects Server Actions ("x-forwarded-host does not match origin"). Codespaces sets
// CODESPACES=true; Vercel never does, so production keeps the default same-origin check.
const codespacesOrigins =
  process.env.CODESPACES === "true" ? ["localhost:3000", "*.app.github.dev"] : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Unit 21 step 8: always put <title>/<meta> in the <head>. By default Next streams metadata
  // into the body for pages that read the URL (here /properties, whose title and canonical
  // follow the filters); Lighthouse and some crawlers then miss the description. /properties'
  // metadata only parses the query string, so waiting for it costs nothing.
  htmlLimitedBots: /.*/,
  ...(codespacesOrigins
    ? { experimental: { serverActions: { allowedOrigins: codespacesOrigins } } }
    : {}),
  images: {
    // Property photos uploaded to Vercel Blob (Unit 15); /samples/ seed images are local.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        // Tailwind only processes global CSS (app/globals.css). CSS modules are plain CSS
        // using the token variables; running them through this rule with `as: "*.css"`
        // turned them into global stylesheets and dropped their scoped class names.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
