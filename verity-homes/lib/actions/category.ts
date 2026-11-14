"use server";

// Blog category actions (Unit 18): add (also used inline by the post editor), rename (the slug
// follows the name) and delete — only when no post uses the category. Zod → requireAdmin() →
// write → updateTag("posts"), so the /blog pills and sidebar update straight away.
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  deleteCategoryRow,
  insertCategory,
  isCategoryNameTaken,
  isCategorySlugTaken,
  renameCategory,
} from "@/lib/db/mutations/posts";
import { POSTS_TAG } from "@/lib/db/queries/posts";
import { uniqueSlug } from "@/lib/slug";
import { categorySchema, postIdSchema } from "@/lib/validation/post";

export type CategoryActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: { name?: string } };

type CategoryRow = { id: string; name: string; slug: string };

const MSG = {
  check: "Please check the category name.",
  forbidden: "You don't have permission to do that.",
  missing: "That category no longer exists.",
  failed: "Something went wrong. Please try again.",
  taken: "There's already a category with this name.",
} as const;

async function admin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e;
  }
}

function refresh() {
  updateTag(POSTS_TAG);
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin", "layout");
}

function parse(input: unknown) {
  const r = categorySchema.safeParse(input);
  if (r.success) return { ok: true as const, name: r.data.name.replace(/\s+/g, " ") };
  return {
    ok: false as const,
    error: MSG.check,
    fieldErrors: { name: r.error.issues[0]?.message ?? MSG.check },
  };
}

export async function createCategory(input: unknown): Promise<CategoryActionResult<CategoryRow>> {
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (await isCategoryNameTaken(p.name))
      return { ok: false, error: MSG.check, fieldErrors: { name: MSG.taken } };
    const slug = await uniqueSlug(p.name, (s) => isCategorySlugTaken(s));
    const row = await insertCategory(p.name, slug);
    refresh();
    return { ok: true, data: row, message: `Added “${row.name}”.` };
  } catch (e) {
    console.error("createCategory failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function updateCategory(
  id: unknown,
  input: unknown,
): Promise<CategoryActionResult<CategoryRow>> {
  const cid = postIdSchema.safeParse(id);
  if (!cid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (await isCategoryNameTaken(p.name, cid.data))
      return { ok: false, error: MSG.check, fieldErrors: { name: MSG.taken } };
    const slug = await uniqueSlug(p.name, (s) => isCategorySlugTaken(s, cid.data));
    const row = await renameCategory(cid.data, p.name, slug);
    if (!row) return { ok: false, error: MSG.missing };
    refresh();
    return { ok: true, data: row, message: `Renamed to “${row.name}”.` };
  } catch (e) {
    console.error("updateCategory failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

/** "Move 2 posts first" when posts still use it; nothing is deleted then. */
export async function deleteCategory(id: unknown): Promise<CategoryActionResult> {
  const cid = postIdSchema.safeParse(id);
  if (!cid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await deleteCategoryRow(cid.data);
    if (!row) return { ok: false, error: MSG.missing };
    if (row.blocked > 0) {
      const n = row.blocked;
      return {
        ok: false,
        error: `Move ${n} ${n === 1 ? "post" : "posts"} to another category first — “${row.name}” is still in use.`,
      };
    }
    refresh();
    return { ok: true, data: undefined, message: `Deleted “${row.name}”.` };
  } catch (e) {
    console.error("deleteCategory failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}
