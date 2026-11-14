// Investment plan editor schema (Unit 17), shared by the admin form and lib/actions/plan.ts.
// Input = the form's strings; output = what the database gets (kobo BigInt, numbers).
import { z } from "zod";
import { koboFromNaira } from "@/lib/format";
import { GUARANTEE_MESSAGE, mentionsGuarantee } from "./no-guarantee";

export const PAYOUT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "AT_MATURITY"] as const;

export const PLAN_LIMITS = {
  name: 80,
  badge: 30,
  summary: 300,
  tenureMonths: 600,
  slug: 80,
  description: 20_000,
  partner: 120,
  terms: 1000,
  packages: 20,
  packageLabel: 60,
  packageTenure: 120,
} as const;

const RATE_RE = /^\d{1,3}(\.\d{1,2})?$/;

const copy = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .refine((s) => !mentionsGuarantee(s), GUARANTEE_MESSAGE);

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "" allowed (optional amount); otherwise naira > 0. */
function amountIssue(v: string, label: string): string | null {
  if (v === "") return `Add ${label}`;
  try {
    return koboFromNaira(v) > 0n ? null : `Enter ${label} above ₦0`;
  } catch {
    return `Enter ${label} in naira, e.g. 10,000,000`;
  }
}

/** Unit 17c: "invest X, receive Y after N months". */
const packageSchema = z
  .object({
    id: z.string().max(40).optional(),
    label: copy(PLAN_LIMITS.packageLabel, "Keep the package name under 60 characters"),
    amount: z.string().trim(),
    receive: z.string().trim(),
    tenureMonths: z
      .string()
      .trim()
      .refine(
        (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= PLAN_LIMITS.packageTenure,
        "Tenure: 1 to 120 months",
      )
      .transform(Number),
  })
  .superRefine((p, ctx) => {
    const a = amountIssue(p.amount, "the amount to invest");
    const r = amountIssue(p.receive, "the amount to receive");
    if (a) ctx.addIssue({ code: "custom", path: ["amount"], message: a });
    if (r) ctx.addIssue({ code: "custom", path: ["receive"], message: r });
    if (!a && !r && koboFromNaira(p.receive) <= koboFromNaira(p.amount)) {
      ctx.addIssue({
        code: "custom",
        path: ["receive"],
        message: "What they receive must be more than what they invest",
      });
    }
  });

export const planSchema = z
  .object({
    name: copy(PLAN_LIMITS.name, "Keep the name under 80 characters").pipe(
      z.string().min(1, "Add a plan name"),
    ),
    badge: copy(PLAN_LIMITS.badge, "Keep the badge under 30 characters"),
    summary: copy(PLAN_LIMITS.summary, "Keep the summary under 300 characters"),
    minimum: z.string().trim(),
    returnRatePercent: z
      .string()
      .trim()
      .refine(
        (s) => RATE_RE.test(s) && Number(s) <= 100,
        "Enter a rate from 0 to 100 (up to 2 decimals), e.g. 18.5 — or 0 if it isn't approved yet",
      ),
    tenureMonths: z.string().trim(),
    payoutFrequency: z.enum(PAYOUT_FREQUENCIES, "Choose how returns are paid"),
    highlighted: z.boolean(),
    // ---- Unit 17c ----
    slug: z
      .string()
      .trim()
      .max(PLAN_LIMITS.slug, "Keep the web address under 80 characters")
      .refine(
        (v) => v === "" || SLUG_RE.test(v),
        "Use lowercase letters, numbers and single hyphens",
      )
      .default(""),
    description: copy(PLAN_LIMITS.description, "The description is too long").default(""),
    partnerName: copy(PLAN_LIMITS.partner, "Keep this under 120 characters").default(""),
    contractWith: copy(PLAN_LIMITS.partner, "Keep this under 120 characters").default(""),
    payoutTerms: copy(PLAN_LIMITS.terms, "Keep the payout terms under 1,000 characters").default(
      "",
    ),
    exitTerms: copy(PLAN_LIMITS.terms, "Keep the exit terms under 1,000 characters").default(""),
    packages: z
      .array(packageSchema)
      .max(PLAN_LIMITS.packages, `Up to ${PLAN_LIMITS.packages} packages`)
      .default([]),
  })
  .superRefine((v, ctx) => {
    // With packages, minimum and tenure come from them (fields disabled in the editor).
    if (v.packages.length > 0) return;
    if (
      !/^\d+$/.test(v.tenureMonths) ||
      Number(v.tenureMonths) < 1 ||
      Number(v.tenureMonths) > PLAN_LIMITS.tenureMonths
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["tenureMonths"],
        message: "Enter the tenure in whole months, e.g. 12",
      });
    }
    if (v.minimum === "") {
      ctx.addIssue({ code: "custom", path: ["minimum"], message: "Add the minimum investment" });
      return;
    }
    try {
      if (koboFromNaira(v.minimum) <= 0n)
        ctx.addIssue({ code: "custom", path: ["minimum"], message: "Enter an amount above ₦0" });
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["minimum"],
        message: "Enter the minimum in naira, e.g. 5,000,000",
      });
    }
  })
  .transform((v) => {
    const packages = v.packages.map((p, i) => ({
      id: p.id,
      label: p.label === "" ? null : p.label,
      amountKobo: koboFromNaira(p.amount),
      returnAmountKobo: koboFromNaira(p.receive),
      tenureMonths: p.tenureMonths,
      sortOrder: i,
    }));
    const has = packages.length > 0;
    return {
      name: v.name,
      badge: v.badge === "" ? null : v.badge,
      summary: v.summary === "" ? null : v.summary,
      // Kept in step with the packages when there are any (the UI then uses the packages).
      minimumKobo: has
        ? packages.map((p) => p.amountKobo).reduce((a, b) => (b < a ? b : a))
        : koboFromNaira(v.minimum),
      /** Stored as Decimal(5,2); "18.5" → 18.5. 0 = not yet approved (public placeholder). */
      returnRatePercent: Number(v.returnRatePercent),
      tenureMonths: has ? Math.min(...packages.map((p) => p.tenureMonths)) : Number(v.tenureMonths),
      payoutFrequency: v.payoutFrequency,
      highlighted: v.highlighted,
      slug: v.slug,
      description: v.description,
      partnerName: v.partnerName === "" ? null : v.partnerName,
      contractWith: v.contractWith === "" ? null : v.contractWith,
      payoutTerms: v.payoutTerms === "" ? null : v.payoutTerms,
      exitTerms: v.exitTerms === "" ? null : v.exitTerms,
      packages,
    };
  });

export type PlanPublishField = "packages" | "slug" | "contractWith" | "payoutTerms";

/**
 * What a plan needs before it can go live (Unit 17c): at least one package, a web address,
 * who the agreement is with, and the payout terms. Empty → ready.
 */
export function planPublishIssues(v: {
  packageCount: number;
  slug: string | null;
  contractWith: string | null;
  payoutTerms: string | null;
}): Partial<Record<PlanPublishField, string>> {
  const issues: Partial<Record<PlanPublishField, string>> = {};
  if (v.packageCount < 1) issues.packages = "Add at least one package before publishing";
  if (!v.slug?.trim()) issues.slug = "Add a web address before publishing";
  if (!v.contractWith?.trim())
    issues.contractWith = "Say who the investor signs the agreement with before publishing";
  if (!v.payoutTerms?.trim()) issues.payoutTerms = "Add the payout terms before publishing";
  return issues;
}

export type PlanFormValues = z.input<typeof planSchema>;
export type PlanData = z.output<typeof planSchema>;

export const EMPTY_PLAN: PlanFormValues = {
  name: "",
  badge: "",
  summary: "",
  minimum: "",
  returnRatePercent: "0",
  tenureMonths: "12",
  payoutFrequency: "QUARTERLY",
  highlighted: false,
  slug: "",
  description: "",
  partnerName: "",
  contractWith: "",
  payoutTerms: "",
  exitTerms: "",
  packages: [],
};

export const PLAN_FIELD_LABEL: Record<string, string> = {
  name: "Plan name",
  badge: "Badge",
  summary: "Summary",
  minimum: "Minimum investment",
  returnRatePercent: "Return rate",
  tenureMonths: "Tenure",
  payoutFrequency: "Payout",
  slug: "Web address",
  description: "Description",
  partnerName: "Partner",
  contractWith: "Agreement with",
  payoutTerms: "Payout terms",
  exitTerms: "Exit terms",
  packages: "Packages",
};

export const recordIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]{8,40}$/);

/** New order for a list: every id once, max 200. */
export const orderSchema = z
  .array(recordIdSchema)
  .min(1)
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, "Each item once");
