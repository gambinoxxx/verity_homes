// Admin reads for investment plans and FAQs (Unit 17). Each calls requireAdmin() itself and is
// not cached — the admin sees drafts, always live.
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { nairaInputFromKobo } from "@/lib/format";
import type { FaqPageKey } from "@/lib/validation/faq";
import type { PlanFormValues } from "@/lib/validation/plan";

export type AdminPlanRow = {
  id: string;
  name: string;
  badge: string | null;
  minimumKobo: string; // BigInt as a string: safe to pass to the client table
  returnRatePercent: number;
  tenureMonths: number;
  payoutFrequency: "MONTHLY" | "QUARTERLY" | "AT_MATURITY";
  highlighted: boolean;
  status: "DRAFT" | "PUBLISHED";
  /** Enquiries that mention this plan (they keep their history if it's deleted). */
  enquiryCount: number;
};

export async function listAdminPlans(): Promise<AdminPlanRow[]> {
  await requireAdmin();
  const rows = await db.investmentPlan.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      badge: true,
      minimumKobo: true,
      returnRatePercent: true,
      tenureMonths: true,
      payoutFrequency: true,
      highlighted: true,
      status: true,
      _count: { select: { enquiries: true } },
    },
  });
  return rows.map(({ _count, minimumKobo, returnRatePercent, ...r }) => ({
    ...r,
    minimumKobo: minimumKobo.toString(),
    returnRatePercent: Number(returnRatePercent),
    enquiryCount: _count.enquiries,
  }));
}

export type AdminPlanEditor = {
  id: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt: Date;
  updatedAt: Date;
  enquiryCount: number;
  values: PlanFormValues;
};

export async function getAdminPlan(id: string): Promise<AdminPlanEditor | null> {
  await requireAdmin();
  const p = await db.investmentPlan.findUnique({
    where: { id },
    include: { _count: { select: { enquiries: true } } },
  });
  if (!p) return null;
  return {
    id: p.id,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    enquiryCount: p._count.enquiries,
    values: {
      name: p.name,
      badge: p.badge ?? "",
      summary: p.summary ?? "",
      minimum: nairaInputFromKobo(p.minimumKobo),
      returnRatePercent: Number(p.returnRatePercent).toString(),
      tenureMonths: String(p.tenureMonths),
      payoutFrequency: p.payoutFrequency,
      highlighted: p.highlighted,
    },
  };
}

/** The plan that currently has the gold card (for the editor's note), if any. */
export async function getHighlightedPlan(): Promise<{ id: string; name: string } | null> {
  await requireAdmin();
  return db.investmentPlan.findFirst({
    where: { highlighted: true },
    select: { id: true, name: true },
  });
}

export type AdminFaq = {
  id: string;
  page: FaqPageKey;
  question: string;
  answer: string;
  status: "DRAFT" | "PUBLISHED";
};

export async function listAdminFaqs(): Promise<AdminFaq[]> {
  await requireAdmin();
  return db.faq.findMany({
    orderBy: [{ page: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, page: true, question: true, answer: true, status: true },
  });
}
