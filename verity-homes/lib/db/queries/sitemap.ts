import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import { PLANS_TAG } from "./invest";
import { POSTS_TAG } from "./posts";
import { PROPERTIES_TAG } from "./properties";

export type SitemapRow = { path: string; lastModified: Date };

/**
 * Published properties, posts and plans for app/sitemap.ts (Unit 20): path + last update.
 * Drafts never appear. Cached with each entity's tag, so a publish/unpublish/rename updates it.
 */
export async function getSitemapRows(): Promise<SitemapRow[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG, POSTS_TAG, PLANS_TAG);
  cacheLife("max");
  const published = { status: "PUBLISHED" } as const;
  const select = { slug: true, updatedAt: true } as const;
  const [properties, posts, plans] = await Promise.all([
    db.property.findMany({ where: published, orderBy: { updatedAt: "desc" }, select }),
    db.post.findMany({ where: published, orderBy: { updatedAt: "desc" }, select }),
    db.investmentPlan.findMany({
      where: { ...published, slug: { not: null } },
      orderBy: { sortOrder: "asc" },
      select,
    }),
  ]);
  return [
    ...properties.map((r) => ({ path: `/properties/${r.slug}`, lastModified: r.updatedAt })),
    ...posts.map((r) => ({ path: `/blog/${r.slug}`, lastModified: r.updatedAt })),
    ...plans.flatMap((r) =>
      r.slug ? [{ path: `/invest/${r.slug}`, lastModified: r.updatedAt }] : [],
    ),
  ];
}
