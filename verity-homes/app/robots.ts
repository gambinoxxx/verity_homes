import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { robotsRules } from "@/lib/sitemap";

/**
 * /robots.txt: production allows the public site (not /admin, /api, /sign-in) and links the
 * sitemap; previews and local dev disallow everything (lib/sitemap.ts). VERCEL_ENV is set by
 * Vercel at build and run time, so the prerendered file matches the deployment.
 */
export default function robots(): MetadataRoute.Robots {
  return robotsRules(env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_ENV);
}
