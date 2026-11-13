// Plan + FAQ writes (Unit 17), called only by lib/actions/plan.ts and lib/actions/faq.ts after
// Zod + requireAdmin().
import "server-only";
import { db } from "@/lib/db/client";
import type { FaqPageKey } from "@/lib/validation/faq";
import type { PlanData } from "@/lib/validation/plan";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Only one plan has the gold card: when `id` is highlighted, every other plan is turned off
 * in the same transaction.
 */
export async function clearOtherHighlights(tx: Tx, id: string): Promise<number> {
  const res = await tx.investmentPlan.updateMany({
    where: { highlighted: true, NOT: { id } },
    data: { highlighted: false },
  });
  return res.count;
}

function columns(d: PlanData) {
  return {
    name: d.name,
    badge: d.badge,
    summary: d.summary,
    minimumKobo: d.minimumKobo,
    returnRatePercent: d.returnRatePercent,
    tenureMonths: d.tenureMonths,
    payoutFrequency: d.payoutFrequency,
    highlighted: d.highlighted,
  };
}

export async function insertPlan(d: PlanData) {
  return db.$transaction(async (tx) => {
    const last = await tx.investmentPlan.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const row = await tx.investmentPlan.create({
      data: { ...columns(d), status: "DRAFT", sortOrder: (last?.sortOrder ?? -1) + 1 },
      select: { id: true },
    });
    const cleared = d.highlighted ? await clearOtherHighlights(tx, row.id) : 0;
    return { id: row.id, cleared };
  });
}

/** null → no such plan. */
export async function savePlan(id: string, d: PlanData) {
  return db.$transaction(async (tx) => {
    const found = await tx.investmentPlan.findUnique({ where: { id }, select: { id: true } });
    if (!found) return null;
    await tx.investmentPlan.update({ where: { id }, data: columns(d) });
    const cleared = d.highlighted ? await clearOtherHighlights(tx, id) : 0;
    return { id, cleared };
  });
}

export async function setPlanStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  const found = await db.investmentPlan.findUnique({ where: { id }, select: { id: true } });
  if (!found) return null;
  return db.investmentPlan.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
}

/** Enquiries keep their history: Enquiry.planId is SetNull. null → no such plan. */
export async function deletePlanRow(id: string) {
  return db.$transaction(async (tx) => {
    const plan = await tx.investmentPlan.findUnique({
      where: { id },
      select: { name: true, _count: { select: { enquiries: true } } },
    });
    if (!plan) return null;
    await tx.investmentPlan.delete({ where: { id } });
    return { name: plan.name, enquiries: plan._count.enquiries };
  });
}

/** sortOrder = position in `ids`. Returns false if any id isn't a plan. */
export async function reorderPlanRows(ids: string[]): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const n = await tx.investmentPlan.count({ where: { id: { in: ids } } });
    if (n !== ids.length) return false;
    for (const [i, id] of ids.entries()) {
      await tx.investmentPlan.update({ where: { id }, data: { sortOrder: i } });
    }
    return true;
  });
}

// ---- FAQs ----

export async function insertFaq(d: { page: FaqPageKey; question: string; answer: string }) {
  return db.$transaction(async (tx) => {
    const last = await tx.faq.findFirst({
      where: { page: d.page },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return tx.faq.create({
      data: { ...d, status: "DRAFT", sortOrder: (last?.sortOrder ?? -1) + 1 },
      select: { id: true },
    });
  });
}

export async function updateFaqRow(
  id: string,
  d: { page: FaqPageKey; question: string; answer: string },
) {
  const found = await db.faq.findUnique({ where: { id }, select: { page: true } });
  if (!found) return null;
  return db.faq.update({ where: { id }, data: d, select: { id: true } });
}

export async function setFaqStatusRow(id: string, status: "DRAFT" | "PUBLISHED") {
  const found = await db.faq.findUnique({ where: { id }, select: { id: true } });
  if (!found) return null;
  return db.faq.update({ where: { id }, data: { status }, select: { id: true, status: true } });
}

export async function deleteFaqRow(id: string) {
  const found = await db.faq.findUnique({ where: { id }, select: { question: true } });
  if (!found) return null;
  await db.faq.delete({ where: { id } });
  return found;
}

/** sortOrder within one page = position in `ids`. False if any id isn't a FAQ on that page. */
export async function reorderFaqRows(page: FaqPageKey, ids: string[]): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const n = await tx.faq.count({ where: { page, id: { in: ids } } });
    if (n !== ids.length) return false;
    for (const [i, id] of ids.entries()) {
      await tx.faq.update({ where: { id }, data: { sortOrder: i } });
    }
    return true;
  });
}
