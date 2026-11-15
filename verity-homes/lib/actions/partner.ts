"use server";

// Partner actions (Unit 19b): Zod → requireAdmin() → write → updateTag("partners") +
// revalidatePath("/", "/about"), so both partner marquees update at once. Consent rule:
// publishing needs permission to display the logo (partnerPublishSchema, checked on the saved
// row), saving without it unpublishes, and the public query also requires it.
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  deletePartnerRow,
  findPartnerState,
  insertPartner,
  reorderPartnerRows,
  savePartner,
  setPartnerStatus,
} from "@/lib/db/mutations/trust";
import { PARTNERS_TAG } from "@/lib/db/queries/trust";
import { isTrustImageUrl } from "@/lib/trust-images";
import { blobPathPrefix } from "@/lib/storage";
import {
  partnerPublishSchema,
  partnerSchema,
  trustIdSchema,
  trustOrderSchema,
} from "@/lib/validation/trust";
import { removeTrustFiles, sweepTrustFolder } from "./trust-images";

import type { TrustActionResult } from "./testimonial";

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That partner no longer exists.",
  failed: "Something went wrong. Please try again.",
  badImage: "That logo wasn't uploaded for this partner. Please upload it again.",
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
  updateTag(PARTNERS_TAG);
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin", "layout");
}

const errName = (e: unknown) => (e instanceof Error ? e.name : "unknown");

function parse(input: unknown) {
  const r = partnerSchema.safeParse(input);
  if (r.success) return { ok: true as const, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
  return { ok: false as const, error: MSG.check, fieldErrors };
}

export async function createPartner(input: unknown): Promise<TrustActionResult<{ id: string }>> {
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await insertPartner(p.data);
    refresh();
    return { ok: true, data: { id: row.id }, message: "Draft saved." };
  } catch (e) {
    console.error("createPartner failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function updatePartner(
  id: unknown,
  input: unknown,
): Promise<TrustActionResult<{ id: string; status: "DRAFT" | "PUBLISHED" }>> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPartnerState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    if (
      p.data.logoUrl &&
      p.data.logoUrl !== current.logoUrl &&
      !isTrustImageUrl(blobPathPrefix(), "partners", current.id, p.data.logoUrl)
    )
      return { ok: false, error: MSG.check, fieldErrors: { logoUrl: MSG.badImage } };
    const row = await savePartner(current.id, p.data, current.status);
    refresh();
    await sweepTrustFolder("partners", current.id, p.data.logoUrl, current.logoUrl);
    const unpublished = current.status === "PUBLISHED" && row.status === "DRAFT";
    return {
      ok: true,
      data: { id: row.id, status: row.status },
      message: unpublished
        ? "Saved — and unpublished, because permission to show the logo is no longer ticked."
        : "Changes saved.",
    };
  } catch (e) {
    console.error("updatePartner failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function publishPartner(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPartnerState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const consent = partnerPublishSchema.safeParse(current);
    if (!consent.success) {
      const message = consent.error.issues[0]?.message ?? MSG.check;
      return { ok: false, error: message, fieldErrors: { consentConfirmed: message } };
    }
    await setPartnerStatus(current.id, "PUBLISHED");
    refresh();
    return {
      ok: true,
      data: undefined,
      message: "Published — it's in the partner strip on the home page and /about.",
    };
  } catch (e) {
    console.error("publishPartner failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function unpublishPartner(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPartnerState(tid.data);
    if (!current) return { ok: false, error: MSG.missing };
    await setPartnerStatus(current.id, "DRAFT");
    refresh();
    return { ok: true, data: undefined, message: "Unpublished — now a draft." };
  } catch (e) {
    console.error("unpublishPartner failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}

export async function deletePartner(id: unknown): Promise<TrustActionResult> {
  const tid = trustIdSchema.safeParse(id);
  if (!tid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  let row: Awaited<ReturnType<typeof deletePartnerRow>>;
  try {
    row = await deletePartnerRow(tid.data);
  } catch (e) {
    console.error("deletePartner failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
  if (!row) return { ok: false, error: MSG.missing };
  refresh();
  await removeTrustFiles("partners", tid.data, row.logoUrl);
  return { ok: true, data: undefined, message: `Deleted “${row.name}”.` };
}

export async function reorderPartners(ids: unknown): Promise<TrustActionResult> {
  const order = trustOrderSchema.safeParse(ids);
  if (!order.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await reorderPartnerRows(order.data)))
      return { ok: false, error: "The list changed — reload and try again." };
    refresh();
    return { ok: true, data: undefined, message: "Order saved." };
  } catch (e) {
    console.error("reorderPartners failed:", errName(e));
    return { ok: false, error: MSG.failed };
  }
}
