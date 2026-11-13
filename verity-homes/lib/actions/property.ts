"use server";

// Admin property actions (Unit 14). Every action: Zod → requireAdmin() → write →
// updateTag("properties") + revalidatePath, so the home page, /properties and the detail page
// show the change on the next request (Next 16 updateTag: read-your-own-writes).
// Only friendly messages are returned, never raw errors.
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import { PROPERTIES_TAG } from "@/lib/db/queries/properties";
import {
  deletePropertyRow,
  findPropertyState,
  insertProperty,
  isPropertySlugTaken,
  savePropertyEdits,
  setPropertyStatus,
} from "@/lib/db/mutations/properties";
import { uniqueSlug } from "@/lib/slug";
import { remove } from "@/lib/storage";
import {
  type PropertyData,
  propertyIdSchema,
  propertySchema,
  publishIssues,
} from "@/lib/validation/property";

export type PropertyActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That property no longer exists.",
  failed: "Something went wrong. Please try again.",
  slugTaken: "Another property already uses this web address. Choose a different one.",
} as const;

/** First message per field path ("documents.0.name"). */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path.map(String).join(".") || "form";
    out[key] ??= i.message;
  }
  return out;
}

/** requireAdmin(): a non-admin gets a friendly error; signed out still redirects to sign-in. */
async function admin(): Promise<{ userId: string } | null> {
  try {
    return await requireAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError) return null;
    throw e;
  }
}

function refreshPublicPages(...slugs: string[]) {
  updateTag(PROPERTIES_TAG);
  revalidatePath("/");
  revalidatePath("/properties");
  for (const slug of new Set(slugs)) revalidatePath(`/properties/${slug}`);
  revalidatePath("/admin", "layout");
}

function parse(
  input: unknown,
):
  | { ok: true; data: PropertyData }
  | { ok: false; error: string; fieldErrors: Record<string, string> } {
  const parsed = propertySchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: MSG.check, fieldErrors: fieldErrors(parsed.error.issues) };
}

export async function createProperty(
  input: unknown,
): Promise<PropertyActionResult<{ id: string; slug: string }>> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  const user = await admin();
  if (!user) return { ok: false, error: MSG.forbidden };
  const d = parsed.data;
  try {
    let slug = d.slug;
    if (!slug) slug = await uniqueSlug(d.title, (s) => isPropertySlugTaken(s));
    else if (await isPropertySlugTaken(slug))
      return { ok: false, error: MSG.check, fieldErrors: { slug: MSG.slugTaken } };
    const row = await insertProperty(d, slug, user.userId);
    refreshPublicPages(row.slug);
    return { ok: true, data: { id: row.id, slug: row.slug }, message: "Draft saved." };
  } catch (e) {
    console.error("createProperty failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function updateProperty(
  id: unknown,
  input: unknown,
): Promise<PropertyActionResult<{ id: string; slug: string }>> {
  const pid = propertyIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  const parsed = parse(input);
  if (!parsed.ok) return parsed;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  const d = parsed.data;
  try {
    const current = await findPropertyState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const slug = d.slug || current.slug;
    if (slug !== current.slug && (await isPropertySlugTaken(slug, current.id)))
      return { ok: false, error: MSG.check, fieldErrors: { slug: MSG.slugTaken } };
    if (current.status === "PUBLISHED") {
      // A live listing must stay publishable.
      const issues = publishIssues({
        title: d.title,
        area: d.area,
        hasPrice: d.priceKobo !== null,
        priceOnRequest: d.priceOnRequest,
      });
      if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
    }
    const row = await savePropertyEdits(current.id, d, slug, current);
    refreshPublicPages(current.slug, row.slug);
    // Removed photos: rows are gone; now their Blob files (a failure only leaves orphans).
    if (row.removedPhotoUrls.length) {
      try {
        await remove(row.removedPhotoUrls);
      } catch (e) {
        console.error("updateProperty: photo clean-up failed:", e instanceof Error ? e.message : e);
      }
    }
    return { ok: true, data: { id: row.id, slug: row.slug }, message: "Changes saved." };
  } catch (e) {
    console.error("updateProperty failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function publishProperty(
  id: unknown,
): Promise<PropertyActionResult<{ slug: string }>> {
  const pid = propertyIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPropertyState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const issues = publishIssues({
      title: current.title,
      area: current.area,
      hasPrice: current.priceKobo !== null,
      priceOnRequest: current.priceOnRequest,
    });
    if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
    // publishedAt is set the first time only.
    const row = await setPropertyStatus(
      current.id,
      "PUBLISHED",
      current.publishedAt ? undefined : new Date(),
    );
    refreshPublicPages(row.slug);
    return { ok: true, data: { slug: row.slug }, message: "Published — it's live on the site." };
  } catch (e) {
    console.error("publishProperty failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function unpublishProperty(
  id: unknown,
): Promise<PropertyActionResult<{ slug: string }>> {
  const pid = propertyIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPropertyState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const row = await setPropertyStatus(current.id, "DRAFT");
    refreshPublicPages(row.slug);
    return { ok: true, data: { slug: row.slug }, message: "Unpublished — now a draft." };
  } catch (e) {
    console.error("unpublishProperty failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function deleteProperty(
  id: unknown,
): Promise<PropertyActionResult<{ title: string }>> {
  const pid = propertyIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  let deleted: Awaited<ReturnType<typeof deletePropertyRow>>;
  try {
    deleted = await deletePropertyRow(pid.data);
  } catch (e) {
    console.error("deleteProperty failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
  if (!deleted) return { ok: false, error: MSG.missing };
  refreshPublicPages(deleted.slug);
  // The row is gone either way; a Blob clean-up failure only leaves orphaned files.
  try {
    await remove(deleted.imageUrls);
  } catch (e) {
    console.error("deleteProperty: photo clean-up failed:", e instanceof Error ? e.message : e);
  }
  return { ok: true, data: { title: deleted.title }, message: `Deleted “${deleted.title}”.` };
}
