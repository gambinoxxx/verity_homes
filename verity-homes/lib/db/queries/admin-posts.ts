// Admin blog reads (Unit 18). Every function calls requireAdmin() itself and is not cached: the
// admin sees drafts, always live.
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { AdminPostFilters } from "@/lib/validation/admin-post-filters";
import type { PostFormValues } from "@/lib/validation/post";

export const ADMIN_POSTS_PAGE_SIZE = 20;

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  coverUrl: string | null;
  category: { name: string } | null;
  publishedAt: Date | null;
  updatedAt: Date;
};

export type AdminPostList = {
  rows: AdminPostRow[];
  total: number;
  /** Per status tab, within the current search and category. */
  counts: { all: number; published: number; draft: number };
  page: number;
  pageSize: number;
};

export async function listAdminPosts(f: AdminPostFilters): Promise<AdminPostList> {
  await requireAdmin();
  const base: Prisma.PostWhereInput = {
    ...(f.category ? { category: { slug: f.category } } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { excerpt: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.PostWhereInput =
    f.status === "all"
      ? base
      : { ...base, status: f.status === "published" ? "PUBLISHED" : "DRAFT" };
  const [rows, all, published, draft] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * ADMIN_POSTS_PAGE_SIZE,
      take: ADMIN_POSTS_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        coverUrl: true,
        publishedAt: true,
        updatedAt: true,
        category: { select: { name: true } },
      },
    }),
    db.post.count({ where: base }),
    db.post.count({ where: { ...base, status: "PUBLISHED" } }),
    db.post.count({ where: { ...base, status: "DRAFT" } }),
  ]);
  const counts = { all, published, draft };
  return {
    rows,
    total: counts[f.status === "all" ? "all" : f.status],
    counts,
    page: f.page,
    pageSize: ADMIN_POSTS_PAGE_SIZE,
  };
}

export type AdminCategory = { id: string; name: string; slug: string; postCount: number };

/** Every category, alphabetical (Q40), with how many posts (any status) use it. */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin();
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
  });
  return rows.map(({ _count, ...c }) => ({ ...c, postCount: _count.posts }));
}

export type AdminPostEditor = {
  id: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  values: PostFormValues;
};

/** One post for the editor. null → 404. */
export async function getAdminPost(id: string): Promise<AdminPostEditor | null> {
  await requireAdmin();
  if (!/^[a-z0-9]{8,40}$/.test(id)) return null;
  const p = await db.post.findUnique({ where: { id } });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt,
    values: {
      title: p.title,
      slug: p.slug,
      categoryId: p.categoryId ?? "",
      excerpt: p.excerpt,
      authorName: p.authorName,
      coverUrl: p.coverUrl ?? "",
      coverPathname: p.coverPathname ?? "",
      coverAlt: p.coverAlt,
      content: p.content,
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
    },
  };
}

/** For the upload route: does the post exist? */
export async function postExists(id: string): Promise<boolean> {
  await requireAdmin();
  return (await db.post.findUnique({ where: { id }, select: { id: true } })) !== null;
}
