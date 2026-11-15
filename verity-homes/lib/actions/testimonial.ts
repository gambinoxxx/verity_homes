"use server";

// Testimonial actions (Unit 19b): Zod → requireAdmin() → write → updateTag("testimonials") +
// revalidatePath("/"), so the home carousel updates at once. Consent rule: publishing needs the
// client's written permission (testimonialPublishSchema, checked on the saved row), saving
// without it unpublishes, and the public query also requires it.
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  deleteTestimonialRow,
  findTestimonialState,
  insertTestimonial,
  reorderTestimonialRows,
  saveTestimonial,
  setTestimonialStatus,
} from "@/lib/db/mutations/trust";
import { TESTIMONIALS_TAG } from "@/lib/db/queries/trust";
import { isTrustImageUrl } from "@/lib/trust-images";
import { blobPathPrefix } from "@/lib/storage";
import {
  testimonialPublishSchema,
  testimonialSchema,
  trustIdSchema,
  trustOrderSchema,
} from "@/lib/validation/trust";
import { removeTrustFiles, sweepTrustFolder } from "./trust-images";

export type TrustActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That testimonial no longer exists.",
  failed: "Something went wrong. Please try again.",
  badImage: "That photo wasn't uploaded for this testimonial. Please upload it again.",
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
  updateTag(TESTIMONIALS_TAG);
  revalidatePath("/");
  revalidatePath("/admin", "layout");
}

const errName = (e: unknown) => (e instanceof Error ? e.name : "unknown");

function parse(input: unknown) {
  const r = testimonialSchema.safeParse(input);
  if (r.success) return { ok: true as const, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
  return { ok: false as const, error: MSG.check, fieldErrors };
}

export async function createTestimonial(
  input: unknown,
): Promise<TrustActionResult<{ id: string }>> {
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await insertTestimonial(p.data);
    refresh();
    return { ok: true, data: { id: row.id }, message: "Draft saved." };
  } catch (e) {
    console.error("createTestimonial failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function updateTestimonial(
  id: unknown,
  input: unknown,
): Promise<TrustActionResult<{ id: string; status: "DRAFT" | "PUBLISHED" }>> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findTestimonialState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    if (
      p.data.avatarUrl &&
      p.data.avatarUrl !== current.avatarUrl &&
      !isTrustImageUrl(blobPathPrefix(), "testimonials", current.id, p.data.avatarUrl)
    )
      return { ok: false, error: MSG.check, fieldErrors: { avatarUrl: MSG.badImage } };
    const row = await saveTestimonial(current.id, p.data, current.status);
    refresh();
    await sweepTrustFolder("testimonials", current.id, p.data.avatarUrl, current.avatarUrl);
    const unpublished = current.status === "PUBLISHED" && row.status === "DRAFT";
    return {
      ok: true,
      data: { id: row.id, status: row.status },
      message: unpublished
        ? "Saved — and unpublished, because the client's permission is no longer ticked."
        : "Changes saved.",
    };
  } catch (e) {
    console.error("updateTestimonial failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function publishTestimonial(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findTestimonialState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const consent = testimonialPublishSchema.safeParse(current);
    if (!consent.success) {
      const message = consent.error.issues[0]?.message ?? MSG.check;
      return { ok: false, error: message, fieldErrors: { consentConfirmed: message } };
    }
    await setTestimonialStatus(current.id, "PUBLISHED");
    refresh();
    return { ok: true, data: undefined, message: "Published — it's on the home page." };
  } catch (e) {
    console.error("publishTestimonial failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function unpublishTestimonial(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findTestimonialState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    await setTestimonialStatus(current.id, "DRAFT");
    refresh();
    return { ok: true, data: undefined, message: "Unpublished — now a draft." };
  } catch (e) {
    console.error("unpublishTestimonial failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function deleteTestimonial(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  let row: Awaited<ReturnType<typeof deleteTestimonialRow>>;
  try {
    row = await deleteTestimonialRow(tid.data);
  } catch (e) {
    console.error("deleteTestimonial failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
  if (!row) return { ok: false, error: MSG.missing };
  refresh();
  await removeTrustFiles("testimonials", tid.data, row.avatarUrl);
  return { ok: true, data: undefined, message: `Deleted the testimonial from “${row.name}”.` };
}

export async function reorderTestimonials(ids: unknown): Promise<TrustActionResult> {
  const order = trustOrderSchema.safeParse(ids);
  if (!order.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await reorderTestimonialRows(order.data)))
      return { ok: false, error: "The list changed — reload and try again." };
    refresh();
    return { ok: true, data: undefined, message: "Order saved." };
  } catch (e) {
    console.error("reorderTestimonials failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}
