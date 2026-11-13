"use server";

// FAQ actions (Unit 17): Zod → requireAdmin() → write → updateTag("faqs") + revalidatePath,
// so /invest (and other pages showing FAQs) update straight away.
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  deleteFaqRow,
  insertFaq,
  reorderFaqRows,
  setFaqStatusRow,
  updateFaqRow,
} from "@/lib/db/mutations/plans";
import { FAQS_TAG } from "@/lib/db/queries/invest";
import { FAQ_PAGES, faqSchema } from "@/lib/validation/faq";
import { orderSchema, recordIdSchema } from "@/lib/validation/plan";

export type FaqActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That FAQ no longer exists.",
  failed: "Something went wrong. Please try again.",
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
  updateTag(FAQS_TAG);
  revalidatePath("/invest");
  revalidatePath("/");
}

function parse(input: unknown) {
  const r = faqSchema.safeParse(input);
  if (r.success) return { ok: true as const, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
  return { ok: false as const, error: MSG.check, fieldErrors };
}

export async function createFaq(input: unknown): Promise<FaqActionResult<{ id: string }>> {
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await insertFaq(p.data);
    refresh();
    return { ok: true, data: { id: row.id }, message: "FAQ added as a draft." };
  } catch (e) {
    console.error("createFaq failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function updateFaq(id: unknown, input: unknown): Promise<FaqActionResult> {
  const fid = recordIdSchema.safeParse(id);
  if (!fid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await updateFaqRow(fid.data, p.data))) return { ok: false, error: MSG.missing };
    refresh();
    return { ok: true, data: undefined, message: "FAQ saved." };
  } catch (e) {
    console.error("updateFaq failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function setFaqStatus(id: unknown, status: unknown): Promise<FaqActionResult> {
  const fid = recordIdSchema.safeParse(id);
  const st = z.enum(["DRAFT", "PUBLISHED"]).safeParse(status);
  if (!fid.success) return { ok: false, error: MSG.missing };
  if (!st.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await setFaqStatusRow(fid.data, st.data))) return { ok: false, error: MSG.missing };
    refresh();
    return {
      ok: true,
      data: undefined,
      message: st.data === "PUBLISHED" ? "Published — it's live." : "Unpublished — now a draft.",
    };
  } catch (e) {
    console.error("setFaqStatus failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function deleteFaq(id: unknown): Promise<FaqActionResult> {
  const fid = recordIdSchema.safeParse(id);
  if (!fid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await deleteFaqRow(fid.data))) return { ok: false, error: MSG.missing };
    refresh();
    return { ok: true, data: undefined, message: "FAQ deleted." };
  } catch (e) {
    console.error("deleteFaq failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function reorderFaqs(page: unknown, ids: unknown): Promise<FaqActionResult> {
  const pg = z.enum(FAQ_PAGES).safeParse(page);
  const order = orderSchema.safeParse(ids);
  if (!pg.success || !order.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await reorderFaqRows(pg.data, order.data)))
      return { ok: false, error: "The list changed — reload and try again." };
    refresh();
    return { ok: true, data: undefined, message: "Order saved." };
  } catch (e) {
    console.error("reorderFaqs failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}
