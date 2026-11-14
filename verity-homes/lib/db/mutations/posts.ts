// Blog post + category writes (Unit 18), called only by lib/actions/post.ts and
// lib/actions/category.ts after Zod + requireAdmin(). Slug redirects keep shared links working
// when a published post's web address changes.
import "server-only";
import { db } from "@/lib/db/client";
import type { PostData } from "@/lib/validation/post";

/** True if another post already uses this slug. */
export async function isPostSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const row = await db.post.findFirst({
    where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

export async function categoryExists(id: string): Promise<boolean> {
  return (await db.category.findUnique({ where: { id }, select: { id: true } })) !== null;
}

function columns(d: PostData) {
  return {
    title: d.title,
    categoryId: d.categoryId,
    excerpt: d.excerpt,
    authorName: d.authorName,
    coverUrl: d.coverUrl,
    coverPathname: d.coverPathname,
    coverAlt: d.coverAlt,
    content: d.content,
    readingMinutes: d.readingMinutes,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
  };
}

/** For the actions: current slug, status and everything publishing checks. */
export function findPostState(id: string) {
  return db.post.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
      categoryId: true,
      excerpt: true,
      coverUrl: true,
      coverAlt: true,
      content: true,
      publishedAt: true,
    },
  });
}

/** A new post is always a draft; it has no images yet (they need its id). */
export async function insertPost(d: PostData, slug: string, createdBy: string) {
  return db.post.create({
    data: {
      ...columns(d),
      coverUrl: null,
      coverPathname: null,
      slug,
      status: "DRAFT",
      createdBy,
    },
    select: { id: true, slug: true },
  });
}

/**
 * Saves the editor. If a PUBLISHED post's slug changes, the old address gets a SlugRedirect
 * (POST); older redirects to the old slug are re-pointed (no chains) and a redirect from the new
 * slug is dropped because that address is live again.
 */
export async function savePost(
  id: string,
  d: PostData,
  slug: string,
  previous: { slug: string; status: "DRAFT" | "PUBLISHED" },
) {
  return db.$transaction(async (tx) => {
    const updated = await tx.post.update({
      where: { id },
      data: { ...columns(d), slug },
      select: { id: true, slug: true },
    });
    if (slug !== previous.slug) {
      await tx.slugRedirect.deleteMany({ where: { entity: "POST", fromSlug: slug } });
      await tx.slugRedirect.updateMany({
        where: { entity: "POST", toSlug: previous.slug },
        data: { toSlug: slug },
      });
      if (previous.status === "PUBLISHED") {
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: "POST", fromSlug: previous.slug } },
          create: { entity: "POST", fromSlug: previous.slug, toSlug: slug },
          update: { toSlug: slug },
        });
      }
    }
    return updated;
  });
}

export function setPostStatus(id: string, status: "DRAFT" | "PUBLISHED", publishedAt?: Date) {
  return db.post.update({
    where: { id },
    data: { status, ...(publishedAt ? { publishedAt } : {}) },
    select: { id: true, slug: true, status: true },
  });
}

/**
 * Deletes the post and the redirects that pointed at it (old links 404 instead of redirecting to
 * a missing page). Returns the cover URL and body for the Blob clean-up. null → no such post.
 */
export async function deletePostRow(id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.post.findUnique({
      where: { id },
      select: { slug: true, title: true, coverUrl: true, content: true },
    });
    if (!row) return null;
    await tx.post.delete({ where: { id } });
    await tx.slugRedirect.deleteMany({ where: { entity: "POST", toSlug: row.slug } });
    return row;
  });
}

// ---- Categories ----

/** True if another category already has this name (any case). */
export async function isCategoryNameTaken(name: string, exceptId?: string): Promise<boolean> {
  const row = await db.category.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  return row !== null;
}

/** True if another category already uses this slug. */
export async function isCategorySlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const row = await db.category.findFirst({
    where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

export function insertCategory(name: string, slug: string) {
  return db.category.create({ data: { name, slug }, select: { id: true, name: true, slug: true } });
}

/** null → no such category. */
export async function renameCategory(id: string, name: string, slug: string) {
  const found = await db.category.findUnique({ where: { id }, select: { slug: true } });
  if (!found) return null;
  const row = await db.category.update({
    where: { id },
    data: { name, slug },
    select: { id: true, name: true, slug: true },
  });
  return { ...row, previousSlug: found.slug };
}

/**
 * Deletes a category only when no post (draft or published) uses it — checked in the same
 * transaction. Returns null (missing), { blocked: n } or the deleted row.
 */
export async function deleteCategoryRow(id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.category.findUnique({
      where: { id },
      select: { name: true, slug: true, _count: { select: { posts: true } } },
    });
    if (!row) return null;
    if (row._count.posts > 0) return { blocked: row._count.posts, name: row.name };
    await tx.category.delete({ where: { id } });
    return { blocked: 0, name: row.name, slug: row.slug };
  });
}
