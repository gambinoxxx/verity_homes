// Shared by the enquiry form (client) and the createEnquiry server action.
import { z } from "zod";

const MIN_FILL_MS = 3_000;

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
  source: z.enum(["HOME_PAGE", "PROPERTY_PAGE", "INVEST_PAGE", "CONTACT_PAGE"]),
  propertyId: z.string().optional(),
  planId: z.string().optional(),
  wantsInspection: z.coerce.boolean().default(false),
  amount: z.string().optional(), // naira text from the invest form; convert with koboFromNaira
  company: z.string().max(0, "Spam detected").optional().default(""), // honeypot: must stay empty
  startedAt: z.coerce
    .number()
    .refine((t) => Date.now() - t >= MIN_FILL_MS, "Please take a moment before submitting"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
