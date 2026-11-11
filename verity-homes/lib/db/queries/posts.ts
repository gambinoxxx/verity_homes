import "server-only";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";

export const POSTS_PER_PAGE = 6;
const PUBLISHED = { status: "PUBLISHED" } as const;

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
  category: { select: { name: true, slug: true } },
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

export type PostFilters = { category?: string; q?: string; page?: number };
export type PostPage = { items: PostSummary[]; total: number; page: number; pageCount: number };

export async function listPosts(filters: PostFilters = {}): Promise<PostPage> {
  const where: Prisma.PostWhereInput = {
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
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const [total, items] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
      select: listSelect,
    }),
  ]);
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / POSTS_PER_PAGE)) };
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  return db.post.findFirst({ where: { ...PUBLISHED, slug }, select: detailSelect });
}
