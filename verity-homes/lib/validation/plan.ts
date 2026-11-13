// Investment plan editor schema (Unit 17), shared by the admin form and lib/actions/plan.ts.
// Input = the form's strings; output = what the database gets (kobo BigInt, numbers).
import { z } from "zod";
import { koboFromNaira } from "@/lib/format";
import { GUARANTEE_MESSAGE, mentionsGuarantee } from "./no-guarantee";

export const PAYOUT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "AT_MATURITY"] as const;

export const PLAN_LIMITS = { name: 80, badge: 30, summary: 300, tenureMonths: 600 } as const;

const RATE_RE = /^\d{1,3}(\.\d{1,2})?$/;

const copy = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .refine((s) => !mentionsGuarantee(s), GUARANTEE_MESSAGE);

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
    tenureMonths: z
      .string()
      .trim()
      .refine((s) => /^\d+$/.test(s) && Number(s) >= 1, "Enter the tenure in whole months, e.g. 12")
      .transform(Number)
      .refine((n) => n <= PLAN_LIMITS.tenureMonths, "Tenure looks too long (max 600 months)"),
    payoutFrequency: z.enum(PAYOUT_FREQUENCIES, "Choose how returns are paid"),
    highlighted: z.boolean(),
  })
  .superRefine((v, ctx) => {
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
  .transform((v) => ({
    name: v.name,
    badge: v.badge === "" ? null : v.badge,
    summary: v.summary === "" ? null : v.summary,
    minimumKobo: koboFromNaira(v.minimum),
    /** Stored as Decimal(5,2); "18.5" → 18.5. 0 = not yet approved (public placeholder). */
    returnRatePercent: Number(v.returnRatePercent),
    tenureMonths: v.tenureMonths,
    payoutFrequency: v.payoutFrequency,
    highlighted: v.highlighted,
  }));

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
};

export const PLAN_FIELD_LABEL: Record<string, string> = {
  name: "Plan name",
  badge: "Badge",
  summary: "Summary",
  minimum: "Minimum investment",
  returnRatePercent: "Return rate",
  tenureMonths: "Tenure",
  payoutFrequency: "Payout",
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
