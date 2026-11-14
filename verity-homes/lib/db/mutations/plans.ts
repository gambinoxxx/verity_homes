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
    description: d.description,
    partnerName: d.partnerName,
    contractWith: d.contractWith,
    payoutTerms: d.payoutTerms,
    exitTerms: d.exitTerms,
  };
}

function packageColumns(p: PlanData["packages"][number]) {
  return {
    label: p.label,
    amountKobo: p.amountKobo,
    returnAmountKobo: p.returnAmountKobo,
    tenureMonths: p.tenureMonths,
    sortOrder: p.sortOrder,
  };
}

/**
 * Packages as the editor left them (Unit 17c). Ids are kept — enquiries point at a package
 * (packageId) — so existing ones are updated, new ones created, removed ones deleted (their
 * enquiries keep the plan link; packageId becomes null).
 */
async function syncPackages(tx: Tx, planId: string, packages: PlanData["packages"]) {
  const existing = await tx.investmentPackage.findMany({ where: { planId }, select: { id: true } });
  const keep = new Set(packages.flatMap((p) => (p.id ? [p.id] : [])));
  const gone = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (gone.length) await tx.investmentPackage.deleteMany({ where: { planId, id: { in: gone } } });
  const known = new Set(existing.map((e) => e.id));
  for (const p of packages) {
    if (p.id && known.has(p.id)) {
      await tx.investmentPackage.update({ where: { id: p.id }, data: packageColumns(p) });
    } else {
      await tx.investmentPackage.create({ data: { ...packageColumns(p), planId } });
    }
  }
}

/** True if another plan already uses this slug. */
export async function isPlanSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const row = await db.investmentPlan.findFirst({
    where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

/** For the actions: current slug, status and what publishing needs. */
export function findPlanState(id: string) {
  return db.investmentPlan.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      contractWith: true,
      payoutTerms: true,
      _count: { select: { packages: true } },
    },
  });
}

export async function insertPlan(d: PlanData, slug: string) {
  return db.$transaction(async (tx) => {
    const last = await tx.investmentPlan.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const row = await tx.investmentPlan.create({
      data: {
        ...columns(d),
        slug,
        status: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
        packages: { create: d.packages.map(packageColumns) },
      },
      select: { id: true },
    });
    const cleared = d.highlighted ? await clearOtherHighlights(tx, row.id) : 0;
    return { id: row.id, cleared };
  });
}

/**
 * null → no such plan. Changing a PUBLISHED plan's slug writes a SlugRedirect (PLAN), like
 * properties: older redirects are re-pointed and a redirect from the new slug is dropped.
 */
export async function savePlan(id: string, d: PlanData, slug: string) {
  return db.$transaction(async (tx) => {
    const found = await tx.investmentPlan.findUnique({
      where: { id },
      select: { id: true, slug: true, status: true },
    });
    if (!found) return null;
    await tx.investmentPlan.update({ where: { id }, data: { ...columns(d), slug } });
    await syncPackages(tx, id, d.packages);
    if (found.slug && found.slug !== slug) {
      await tx.slugRedirect.deleteMany({ where: { entity: "PLAN", fromSlug: slug } });
      await tx.slugRedirect.updateMany({
        where: { entity: "PLAN", toSlug: found.slug },
        data: { toSlug: slug },
      });
      if (found.status === "PUBLISHED") {
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: "PLAN", fromSlug: found.slug } },
          create: { entity: "PLAN", fromSlug: found.slug, toSlug: slug },
          update: { toSlug: slug },
        });
      }
    }
    const cleared = d.highlighted ? await clearOtherHighlights(tx, id) : 0;
    return { id, cleared, previousSlug: found.slug };
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
    const { slug } = (await tx.investmentPlan.findUnique({ where: { id }, select: { slug: true } })) ?? {};
    await tx.investmentPlan.delete({ where: { id } });
    if (slug) await tx.slugRedirect.deleteMany({ where: { entity: "PLAN", toSlug: slug } });
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
