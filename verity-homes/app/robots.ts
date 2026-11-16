import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { robotsRules } from "@/lib/sitemap";

/** /robots.txt (Unit 20): disallow /admin (and /api/), point crawlers at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return robotsRules(env.NEXT_PUBLIC_SITE_URL);
}
