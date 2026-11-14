import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import type { FaqPage, PayoutFrequency } from "@/lib/generated/prisma/client";
import { planFromAmountKobo, tenureLabel } from "@/lib/invest";
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
  /** Unit 17c: /invest/<slug> (published plans always have one). */
  slug: string | null;
  /** "Invest from": the smallest package, or minimumKobo for a plan without packages. */
  fromKobo: number;
  /** "12 months" or "6–24 months" from the packages, else the plan's tenure. */
  tenure: string;
  packageCount: number;
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
      slug: true,
      packages: {
        orderBy: { sortOrder: "asc" },
        select: { amountKobo: true, tenureMonths: true },
      },
    },
  });
  return rows.map(({ packages, ...r }) => ({
    ...r,
    minimumKobo: koboToNumber(r.minimumKobo),
    returnRatePercent: decimalToNumber(r.returnRatePercent),
    fromKobo: koboToNumber(planFromAmountKobo(packages) ?? r.minimumKobo),
    tenure:
      tenureLabel(packages.map((p) => p.tenureMonths)) ?? `${r.tenureMonths} months`,
    packageCount: packages.length,
  }));
}

// ---- Unit 17c: plan pages /invest/[slug] ----

export type PackageView = {
  id: string;
  label: string | null;
  amountKobo: number;
  returnAmountKobo: number;
  tenureMonths: number;
};

export type PlanDetail = {
  id: string;
  slug: string;
  name: string;
  badge: string | null;
  summary: string | null;
  description: string;
  partnerName: string | null;
  contractWith: string | null;
  payoutTerms: string | null;
  exitTerms: string | null;
  coverUrl: string | null;
  coverAlt: string;
  highlighted: boolean;
  payoutFrequency: PayoutFrequency;
  tenureMonths: number;
  minimumKobo: number;
  packages: PackageView[];
};

/** A published plan by slug, or null. Cached (tag "plans"). */
export async function getPlanBySlug(slug: string): Promise<PlanDetail | null> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("max");
  const p = await db.investmentPlan.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { packages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!p || !p.slug) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    badge: p.badge,
    summary: p.summary,
    description: p.description,
    partnerName: p.partnerName,
    contractWith: p.contractWith,
    payoutTerms: p.payoutTerms,
    exitTerms: p.exitTerms,
    coverUrl: p.coverUrl,
    coverAlt: p.coverAlt,
    highlighted: p.highlighted,
    payoutFrequency: p.payoutFrequency,
    tenureMonths: p.tenureMonths,
    minimumKobo: koboToNumber(p.minimumKobo),
    packages: p.packages.map((k) => ({
      id: k.id,
      label: k.label,
      amountKobo: koboToNumber(k.amountKobo),
      returnAmountKobo: koboToNumber(k.returnAmountKobo),
      tenureMonths: k.tenureMonths,
    })),
  };
}

/** Every published plan slug, for generateStaticParams. Cached (tag "plans"). */
export async function getPublishedPlanSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("max");
  const rows = await db.investmentPlan.findMany({
    where: { status: "PUBLISHED", slug: { not: null } },
    orderBy: { sortOrder: "asc" },
    select: { slug: true },
  });
  return rows.flatMap((r) => (r.slug ? [r.slug] : []));
}

/** The current slug for an old plan slug (SlugRedirect PLAN), or null. Cached (tag "plans"). */
export async function getPlanRedirect(fromSlug: string): Promise<string | null> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("max");
  const row = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "PLAN", fromSlug } },
    select: { toSlug: true },
  });
  return row?.toSlug ?? null;
}

/**
 * For proxy.ts: published → page, old slug → 308, otherwise 404 (with Cache Components the
 * page streams a 200 shell first, so it can't set these statuses itself). Not cached.
 */
export async function resolvePlanSlug(
  slug: string,
): Promise<{ kind: "published" } | { kind: "redirect"; to: string } | { kind: "missing" }> {
  const published = await db.investmentPlan.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (published) return { kind: "published" };
  const redirect = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "PLAN", fromSlug: slug } },
    select: { toSlug: true },
  });
  if (redirect && redirect.toSlug !== slug) return { kind: "redirect", to: redirect.toSlug };
  return { kind: "missing" };
}

export type FaqView = { id: string; question: string; answer: string };

/** Cache tag for FAQ reads. The admin FAQ actions (Unit 17) call updateTag(it). */
export const FAQS_TAG = "faqs";

/** Published FAQs for a page, in order. Cached until an FAQ changes (tag "faqs"). */
export async function getFaqs(page: FaqPage): Promise<FaqView[]> {
  "use cache";
  cacheTag(FAQS_TAG);
  cacheLife("max");
  return db.faq.findMany({
    where: { status: "PUBLISHED", page },
    orderBy: { sortOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });
}
