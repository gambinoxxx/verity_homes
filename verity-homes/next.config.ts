import type { NextConfig } from "next";

/**
 * Content-Security-Policy, limited to directives that cannot break Next's own inline scripts
 * and styles (no script-src / style-src until nonces are set up):
 * - frame-src: only our own pages and the Google Maps embed (property and contact maps,
 *   lib/maps.ts builds www.google.com URLs; Google may answer from maps.google.com).
 * - frame-ancestors: nobody else may frame the site (clickjacking).
 * - object-src / base-uri: no plugins, no <base> hijacking.
 */
const CSP = [
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
