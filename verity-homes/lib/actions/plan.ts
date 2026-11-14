"use server";

// Investment plan actions (Unit 17): Zod → requireAdmin() → write → updateTag("plans") +
// revalidatePath, so /invest and the home page's invest section update straight away.
// Only one plan is highlighted (the gold card): highlighting one clears the others in the
// same transaction (lib/db/mutations/plans.ts).
import { revalidatePath, updateTag } from "next/cache";
import { ForbiddenError, requireAdmin } from "@/lib/auth";
import {
  deletePlanRow,
  insertPlan,
  findPlanState,
  isPlanSlugTaken,
  reorderPlanRows,
  savePlan,
  setPlanStatus,
} from "@/lib/db/mutations/plans";
import { PLANS_TAG } from "@/lib/db/queries/invest";
import { uniqueSlug } from "@/lib/slug";
import {
  orderSchema,
  planPublishIssues,
  planSchema,
  recordIdSchema,
} from "@/lib/validation/plan";

export type PlanActionResult<T = undefined> =
  | { ok: true; data: T; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MSG = {
  check: "Please check the highlighted fields.",
  forbidden: "You don't have permission to do that.",
  missing: "That plan no longer exists.",
  failed: "Something went wrong. Please try again.",
} as const;

async function admin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch (e) {
    if (e instanceof ForbiddenError) return false;
    throw e; // signed out: the redirect to sign-in
  }
}

function refresh(...slugs: (string | null | undefined)[]) {
  updateTag(PLANS_TAG);
  revalidatePath("/");
  revalidatePath("/invest");
  for (const s of new Set(slugs)) if (s) revalidatePath(`/invest/${s}`);
  revalidatePath("/admin", "layout");
}

function parse(input: unknown) {
  const r = planSchema.safeParse(input);
  if (r.success) return { ok: true as const, data: r.data };
  const fieldErrors: Record<string, string> = {};
  for (const i of r.error.issues) fieldErrors[i.path.map(String).join(".") || "form"] ??= i.message;
  return { ok: false as const, error: MSG.check, fieldErrors };
}

const highlightNote = (cleared: number) =>
  cleared ? " It's now the highlighted plan (the other one isn't any more)." : "";

const SLUG_TAKEN = "Another plan already uses this web address. Choose a different one.";

export async function createPlan(input: unknown): Promise<PlanActionResult<{ id: string }>> {
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    let slug = p.data.slug;
    if (!slug) slug = await uniqueSlug(p.data.name, (s) => isPlanSlugTaken(s));
    else if (await isPlanSlugTaken(slug))
      return { ok: false, error: MSG.check, fieldErrors: { slug: SLUG_TAKEN } };
    const row = await insertPlan(p.data, slug);
    refresh();
    return { ok: true, data: { id: row.id }, message: `Draft saved.${highlightNote(row.cleared)}` };
  } catch (e) {
    console.error("createPlan failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function updatePlan(
  id: unknown,
  input: unknown,
): Promise<PlanActionResult<{ id: string }>> {
  const pid = recordIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  const p = parse(input);
  if (!p.ok) return p;
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPlanState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const slug =
      p.data.slug || current.slug || (await uniqueSlug(p.data.name, (s) => isPlanSlugTaken(s)));
    if (slug !== current.slug && (await isPlanSlugTaken(slug, current.id)))
      return { ok: false, error: MSG.check, fieldErrors: { slug: SLUG_TAKEN } };
    if (current.status === "PUBLISHED") {
      // A live plan must stay publishable.
      const issues = planPublishIssues({
        packageCount: p.data.packages.length,
        slug,
        contractWith: p.data.contractWith,
        payoutTerms: p.data.payoutTerms,
      });
      if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
    }
    const row = await savePlan(pid.data, p.data, slug);
    if (!row) return { ok: false, error: MSG.missing };
    refresh(row.previousSlug, slug);
    return {
      ok: true,
      data: { id: row.id },
      message: `Changes saved.${highlightNote(row.cleared)}`,
    };
  } catch (e) {
    console.error("updatePlan failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

async function setStatus(id: unknown, status: "DRAFT" | "PUBLISHED", done: string) {
  const pid = recordIdSchema.safeParse(id);
  if (!pid.success) return { ok: false as const, error: MSG.missing };
  if (!(await admin())) return { ok: false as const, error: MSG.forbidden };
  try {
    const row = await setPlanStatus(pid.data, status);
    if (!row) return { ok: false as const, error: MSG.missing };
    refresh();
    return { ok: true as const, data: undefined, message: done };
  } catch (e) {
    console.error("setPlanStatus failed:", e instanceof Error ? e.message : e);
    return { ok: false as const, error: MSG.failed };
  }
}

export async function publishPlan(id: unknown): Promise<PlanActionResult> {
  const pid = recordIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const current = await findPlanState(pid.data);
    if (!current) return { ok: false, error: MSG.missing };
    const issues = planPublishIssues({
      packageCount: current._count.packages,
      slug: current.slug,
      contractWith: current.contractWith,
      payoutTerms: current.payoutTerms,
    });
    if (Object.keys(issues).length) return { ok: false, error: MSG.check, fieldErrors: issues };
  } catch (e) {
    console.error("publishPlan failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
  return setStatus(id, "PUBLISHED", "Published — it's live on /invest.");
}

export async function unpublishPlan(id: unknown): Promise<PlanActionResult> {
  return setStatus(id, "DRAFT", "Unpublished — now a draft.");
}

export async function deletePlan(id: unknown): Promise<PlanActionResult> {
  const pid = recordIdSchema.safeParse(id);
  if (!pid.success) return { ok: false, error: MSG.missing };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    const row = await deletePlanRow(pid.data);
    if (!row) return { ok: false, error: MSG.missing };
    refresh();
    revalidatePath("/admin/enquiries");
    return { ok: true, data: undefined, message: `Deleted “${row.name}”.` };
  } catch (e) {
    console.error("deletePlan failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}

export async function reorderPlans(ids: unknown): Promise<PlanActionResult> {
  const order = orderSchema.safeParse(ids);
  if (!order.success) return { ok: false, error: MSG.failed };
  if (!(await admin())) return { ok: false, error: MSG.forbidden };
  try {
    if (!(await reorderPlanRows(order.data)))
      return { ok: false, error: "The list changed — reload and try again." };
    refresh();
    return { ok: true, data: undefined, message: "Order saved." };
  } catch (e) {
    console.error("reorderPlans failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: MSG.failed };
  }
}
