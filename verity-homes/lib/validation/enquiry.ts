// Shared by the enquiry form (client) and the createEnquiry server action.
import { z } from "zod";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { LEAD_SOURCE_LIMITS, clipValue, type LeadSource } from "@/lib/lead-source";

/** Minimum time between the form appearing and sending (anti-bot). The form waits it out. */
export const MIN_FILL_MS = 3_000;

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number")
    .transform((v) => {
      const d = v.replace(/\D/g, "");
      return d.startsWith("0") && d.length === 11 ? `234${d.slice(1)}` : d; // 0803… → 234803…
    })
    .refine((d) => d.length >= 10 && d.length <= 15, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.email("Enter a valid email").optional()),
  interest: z
    .enum([
      "BUYING",
      "RENTING",
      "LAND",
      "INVESTING",
      "MANAGEMENT",
      "DEVELOPMENT",
      "LISTING",
      "OTHER",
    ])
    .default("OTHER"),
  message: z.string().trim().max(2000, "Keep your message under 2000 characters").default(""),
  source: z.enum(["HOME_PAGE", "PROPERTY_PAGE", "INVEST_PAGE", "CONTACT_PAGE", "LANDING_PAGE"]),
  propertyId: z.string().optional(),
  planId: z.string().optional(),
  plotId: z.string().max(40).optional(), // Unit 17b: the plot chosen on an estate page
  packageId: z.string().max(40).optional(), // Unit 17c: the package chosen on a plan page
  wantsInspection: z.coerce.boolean().default(false),
  amount: z.string().optional(), // naira text from the invest form; convert with koboFromNaira
  // Honeypot (lib/honeypot.ts): must stay empty. The old "company" field is ignored: autofill
  // filled it and real enquiries were refused.
  [HONEYPOT_FIELD]: z.string().max(0, "Spam detected").optional().default(""),
  startedAt: z.coerce
    .number()
    .refine((t) => Date.now() - t >= MIN_FILL_MS, "Please take a moment before submitting"),
  // Unit 21 step 4: where the visit came from (hidden fields). Never rejects an enquiry:
  // anything odd is trimmed, cleaned and cut to length, or dropped.
  ...leadSourceShape(),
});

function leadSourceShape() {
  const field = (max: number) =>
    z
      .unknown()
      .transform((v) => clipValue(v, max))
      .optional();
  const shape = {} as Record<keyof LeadSource, ReturnType<typeof field>>;
  for (const [key, max] of Object.entries(LEAD_SOURCE_LIMITS) as [keyof LeadSource, number][]) {
    shape[key] = field(max);
  }
  return shape;
}

export type EnquiryInput = z.infer<typeof enquirySchema>;
