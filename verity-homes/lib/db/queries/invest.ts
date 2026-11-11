import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import type { FaqPage, PayoutFrequency } from "@/lib/generated/prisma/client";
import { decimalToNumber, koboToNumber } from "./convert";

export type PlanView = {
  id: string;
  name: string;
  badge: string | null;
  summary: string | null;
  minimumKobo: number;
  /** Per annum. 0 means "not yet approved" and renders as a placeholder. */
  returnRatePercent: number;
  tenureMonths: number;
  payoutFrequency: PayoutFrequency;
  highlighted: boolean;
};

/** Cache tag for plan reads. The admin plan actions (Unit 17) call updateTag(it). */
export const PLANS_TAG = "plans";

/** Home invest section and /invest. Cached until a plan changes (tag "plans"). */
export async function getPublishedPlans(): Promise<PlanView[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("max");
  const rows = await db.investmentPlan.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      badge: true,
      summary: true,
      minimumKobo: true,
      returnRatePercent: true,
      tenureMonths: true,
      payoutFrequency: true,
      highlighted: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    minimumKobo: koboToNumber(r.minimumKobo),
    returnRatePercent: decimalToNumber(r.returnRatePercent),
  }));
}

export type FaqView = { id: string; question: string; answer: string };

export async function getFaqs(page: FaqPage): Promise<FaqView[]> {
  return db.faq.findMany({
    where: { status: "PUBLISHED", page },
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });
}
