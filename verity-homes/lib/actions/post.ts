"use server";

// Admin blog post actions (Unit 18). Every action: Zod → requireAdmin() → write →
// updateTag("posts") + revalidatePath, so /, /blog and /blog/<slug> show the change on the next
// request. Images: covers and body images live in Blob under posts/<id>/; a save deletes the
// files the post no longer uses (old covers, images removed from the body, uploads never used),
// and deleting a post deletes its whole folder. Only friendly messages are returned.
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  categoryExists,
  deletePostRow,
  findPostState,
  insertPost,
  isPostSlugTaken,
  savePost,
  setPostStatus,
} from "@/lib/db/mutations/posts";
import { POSTS_TAG } from "@/lib/db/queries/posts";
import { unreferencedImages } from "@/lib/post-content";
import { isPostImageUrl, postFolder } from "@/lib/post-images";
import { uniqueSlug } from "@/lib/slug";
import { blobPathPrefix, isBlobUrl, listFolder, remove } from "@/lib/storage";
import { type PostData, postIdSchema, postPublishIssues, postSchema } from "@/lib/validation/post";

export type PostActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That post no longer exists.",
  failed: "Something went wrong. Please try again.",
  slugTaken: "Another post already uses this web address. Choose a different one.",
  noCategory: "That category no longer exists. Choose another one.",
  badCover: "That cover image wasn't uploaded for this post. Please upload it again.",
} as const;

/** requireAdmin(): a non-admin gets a friendly error; signed out still redirects to sign-in. */
async function admin(): Promise<{ userId: string } | null> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

function refresh(...slugs: (string | null | undefined)[]) {
  updateTag(POSTS_TAG);
  revalidatePath("/");
  revalidatePath("/blog");
  for (const s of new Set(slugs)) if (s) revalidatePath(`/blog/${s}`);
  revalidatePath("/admin", "layout");
}

function parse(
  input: unknown,
):
  { ok: true; data: PostData } | { ok: false; error: string; fieldErrors: Record<string, string> } {
  const r = postSchema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
  return { ok: false, error: MSG.check, fieldErrors };
}

const usesBlob = (url: string | null, content: string) =>
  (url !== null && isBlobUrl(url)) || content.includes(".blob.vercel-storage.com/");

/** Deletes the post's uploaded files it no longer uses. A failure only leaves orphans. */
async function sweepUnused(id: string, keep: { coverUrl: string | null; content: string }) {
  const folder = postFolder(blobPathPrefix(), id);
  if (!folder) return;
  try {
    const unused = unreferencedImages(await listFolder(folder), keep);
    if (unused.length) await remove(unused);
  } catch (e) {
    console.error("post image clean-up failed:", e instanceof Error ? e.message : e);
  }
}

export async function createPost(
  input: unknown,
): Promise<PostActionResult<{ id: string; slug: string }>> {
  const p = parse(input);
  if (!p.ok) return p;
  const user = await admin();
  if (!user) return { ok: false, error: MSG.forbidden };
  const d = p.data;
  try {
    if (d.categoryId && !(await categoryExists(d.categoryId)))
      return { ok: false, error: MSG.check, fieldErrors: { categoryId: MSG.noCategory } };
    let slug = d.slug;
    if (!slug) slug = await uniqueSlug(d.title, (s) => isPostSlugTaken(s));
    else if (await isPostSlugTaken(slug))
      return { ok: false, error: MSG.check, fieldErrors: { slug: MSG.slugTaken } };
    const row = await insertPost(d, slug, user.userId);
    refresh();
    return { ok: true, data: { id: row.id, slug: row.slug }, message: "Draft saved." };
  } catch (e) {
    console.error("createPost failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function updatePost(
  id: unknown,
  input: unknown,
): Promise<PostActionResult<{ id: string; slug: string }>> {
  const pid = postIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  const d = p.data;
  try {
    const current = await findPostState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const slug = d.slug || current.slug;
    if (slug !== current.slug && (await isPostSlugTaken(slug, current.id)))
      return { ok: false, error: MSG.check, fieldErrors: { slug: MSG.slugTaken } };
    if (d.categoryId && !(await categoryExists(d.categoryId)))
      return { ok: false, error: MSG.check, fieldErrors: { categoryId: MSG.noCategory } };
    // A new cover must be a file uploaded into this post's folder.
    if (
      d.coverUrl &&
      d.coverUrl !== current.coverUrl &&
      !isPostImageUrl(blobPathPrefix(), current.id, d.coverUrl)
    )
      return { ok: false, error: MSG.check, fieldErrors: { cover: MSG.badCover } };
    if (current.status === "PUBLISHED") {
      // A live post must stay publishable.
      const issues = postPublishIssues({ ...d, slug });
      if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
    }
    const row = await savePost(current.id, d, slug, current);
    refresh(current.slug, row.slug);
    if (usesBlob(current.coverUrl, current.content) || usesBlob(d.coverUrl, d.content)) {
      await sweepUnused(current.id, { coverUrl: d.coverUrl, content: d.content });
    }
    return { ok: true, data: { id: row.id, slug: row.slug }, message: "Changes saved." };
  } catch (e) {
    console.error("updatePost failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function publishPost(id: unknown): Promise<PostActionResult<{ slug: string }>> {
  const pid = postIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPostState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const issues = postPublishIssues(current);
    if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
    // publishedAt is set the first time only.
    const row = await setPostStatus(
      current.id,
      "PUBLISHED",
      current.publishedAt ? undefined : new Date(),
    );
    refresh(row.slug);
    return { ok: true, data: { slug: row.slug }, message: "Published — it's live on the blog." };
  } catch (e) {
    console.error("publishPost failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function unpublishPost(id: unknown): Promise<PostActionResult<{ slug: string }>> {
  const pid = postIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPostState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const row = await setPostStatus(current.id, "DRAFT");
    refresh(row.slug);
    return { ok: true, data: { slug: row.slug }, message: "Unpublished — now a draft." };
  } catch (e) {
    console.error("unpublishPost failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function deletePost(id: unknown): Promise<PostActionResult<{ title: string }>> {
  const pid = postIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  let deleted: Awaited<ReturnType<typeof deletePostRow>>;
  try {
    deleted = await deletePostRow(pid.data);
  } catch (e) {
    console.error("deletePost failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
  if (!deleted) return { ok: false, error: MSG.missing };
  refresh(deleted.slug);
  // The row is gone either way; a Blob clean-up failure only leaves orphaned files. remove()
  // skips anything that isn't a Blob file (e.g. /samples/ seed covers).
  try {
    const folder = postFolder(blobPathPrefix(), pid.data);
    const files =
      folder && usesBlob(deleted.coverUrl, deleted.content) ? await listFolder(folder) : [];
    const all = [...new Set([...(deleted.coverUrl ? [deleted.coverUrl] : []), ...files])];
    if (all.length) await remove(all);
  } catch (e) {
    console.error("deletePost: image clean-up failed:", e instanceof Error ? e.message : e);
  }
  return { ok: true, data: { title: deleted.title }, message: `Deleted “${deleted.title}”.` };
}
