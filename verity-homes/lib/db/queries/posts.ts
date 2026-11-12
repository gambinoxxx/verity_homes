import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { BlogFilters } from "@/lib/validation/blog-filters";

export const POSTS_PER_PAGE = 6;
const PUBLISHED = { status: "PUBLISHED" } as const;
const newestFirst = [
  { publishedAt: "desc" },
  { createdAt: "desc" },
] as const satisfies Prisma.PostOrderByWithRelationInput[];

const listSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  coverAlt: true,
  authorName: true,
  readingMinutes: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const satisfies Prisma.PostSelect;

const detailSelect = {
  ...listSelect,
  content: true,
  seoTitle: true,
  seoDescription: true,
  updatedAt: true,
} as const satisfies Prisma.PostSelect;

export type PostSummary = Prisma.PostGetPayload<{ select: typeof listSelect }>;
export type PostDetail = Prisma.PostGetPayload<{ select: typeof detailSelect }>;

export type PostFilters = BlogFilters;
export type PostPage = { items: PostSummary[]; total: number; page: number; pageCount: number };

/** Cache tag for post reads. The admin post actions (Unit 18) call updateTag(it). */
export const POSTS_TAG = "posts";

function listWhere(filters: PostFilters): Prisma.PostWhereInput {
  return {
    ...PUBLISHED,
    ...(filters.category ? { category: { slug: filters.category } } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q, mode: "insensitive" } },
            { excerpt: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

/**
 * Published posts for /blog: category slug, search (title + excerpt, case-insensitive),
 * 6 per page. A page past the end is clamped to the last page. Cached (tag "posts"); the
 * normalised filters object is the cache key.
 */
export async function listPosts(filters: PostFilters = {}): Promise<PostPage> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  const where = listWhere(filters);
  const total = await db.post.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
  const page = Math.min(pageCount, Math.max(1, Math.floor(filters.page ?? 1)));
  const items = await db.post.findMany({
    where,
    orderBy: newestFirst,
    skip: (page - 1) * POSTS_PER_PAGE,
    take: POSTS_PER_PAGE,
    select: listSelect,
  });
  return { items, total, page, pageCount };
}

/** Newest published posts (home page, blog sidebar). Cached until a post changes. */
export async function getLatestPosts(limit = 3): Promise<PostSummary[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  return db.post.findMany({
    where: PUBLISHED,
    orderBy: newestFirst,
    take: limit,
    select: listSelect,
  });
}

export type CategoryCount = { name: string; slug: string; count: number };

/** Categories that have at least one published post, with that count (blog pills + sidebar). */
export async function getPostCategories(): Promise<CategoryCount[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true, _count: { select: { posts: { where: PUBLISHED } } } },
  });
  return rows
    .map((c) => ({ name: c.name, slug: c.slug, count: c._count.posts }))
    .filter((c) => c.count > 0);
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  const rows = await db.post.findMany({
    where: PUBLISHED,
    orderBy: newestFirst,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/** Published post by slug, or null (drafts and unknown slugs). Cached (tag "posts"). */
export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  return db.post.findFirst({ where: { ...PUBLISHED, slug }, select: detailSelect });
}

/** The current slug for a renamed post (SlugRedirect), or null. Cached (tag "posts"). */
export async function getPostRedirect(fromSlug: string): Promise<string | null> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  const row = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "POST", fromSlug } },
    select: { toSlug: true },
  });
  return row?.toSlug ?? null;
}

/**
 * Two related posts: the same category first (newest first), then the newest others.
 * Excludes the post itself. Cached (tag "posts"); id + categoryId are the cache key.
 */
export async function getRelatedPosts(
  post: { id: string; categoryId: string | null },
  limit = 2,
): Promise<PostSummary[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("max");
  const same = post.categoryId
    ? await db.post.findMany({
        where: { ...PUBLISHED, id: { not: post.id }, categoryId: post.categoryId },
        orderBy: newestFirst,
        take: limit,
        select: listSelect,
      })
    : [];
  if (same.length >= limit) return same;
  const others = await db.post.findMany({
    where: { ...PUBLISHED, id: { notIn: [post.id, ...same.map((p) => p.id)] } },
    orderBy: newestFirst,
    take: limit - same.length,
    select: listSelect,
  });
  return [...same, ...others];
}

export type PostSlugStatus =
  { kind: "published" } | { kind: "redirect"; to: string } | { kind: "missing" };

/**
 * Cheap existence check for proxy.ts (two indexed lookups). With Cache Components the page
 * streams its shell first, so the proxy answers 308 / 404 with the real status.
 */
export async function resolvePostSlug(slug: string): Promise<PostSlugStatus> {
  const published = await db.post.findFirst({
    where: { ...PUBLISHED, slug },
    select: { id: true },
  });
  if (published) return { kind: "published" };
  const redirect = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "POST", fromSlug: slug } },
    select: { toSlug: true },
  });
  if (redirect && redirect.toSlug !== slug) return { kind: "redirect", to: redirect.toSlug };
  return { kind: "missing" };
}
