import type { MetadataRoute } from "next";
import { getSitemapRows } from "@/lib/db/queries/sitemap";
import { env } from "@/lib/env";
import { STATIC_SITEMAP_PATHS, sitemapEntries } from "@/lib/sitemap";

/**
 * /sitemap.xml (Unit 20): the public pages, then every published property, post and plan with
 * its last update. Static pages carry no lastModified (no honest date to give).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await getSitemapRows();
  return sitemapEntries(STATIC_SITEMAP_PATHS, rows, env.NEXT_PUBLIC_SITE_URL);
}
