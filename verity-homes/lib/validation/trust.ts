// Testimonial + partner editor schemas (Unit 19b), shared by the admin forms (zodResolver) and
// lib/actions/testimonial.ts / partner.ts. Consent is the rule that matters: nothing is published
// unless the client/partner agreed — enforced here (publish schemas), in the actions and in the
// public queries (lib/db/queries/trust.ts).
import { z } from "zod";

export const TRUST_LIMITS = {
  name: 80,
  serviceUsed: 60,
  quote: 400,
  website: 300,
} as const;

const ID_RE = /^[a-z0-9]{8,40}$/;
export const trustIdSchema = z.string().trim().regex(ID_RE);

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || v.startsWith("/samples/") || /^https:\/\/\S+$/.test(v),
    "That image address doesn't look right",
  );

export const CONSENT_TESTIMONIAL =
  "Tick “The client gave written permission to publish this” before publishing.";
export const CONSENT_PARTNER = "Tick “We have permission to display this logo” before publishing.";

// ---- Testimonials ----

export const testimonialSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Add the client's name")
      .max(TRUST_LIMITS.name, "Keep the name under 80 characters"),
    serviceUsed: z
      .string()
      .trim()
      .min(1, "Add the service they used, e.g. Home buyer")
      .max(TRUST_LIMITS.serviceUsed, "Keep this under 60 characters"),
    quote: z
      .string()
      .trim()
      .min(1, "Add what the client said")
      .max(TRUST_LIMITS.quote, "Keep the quote under 400 characters"),
    rating: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[1-5]$/.test(v), "Choose a rating from 1 to 5, or none"),
    avatarUrl: imageUrl,
    avatarPathname: z.string().trim().max(300),
    consentConfirmed: z.boolean(),
  })
  .transform((v) => ({
    name: v.name,
    serviceUsed: v.serviceUsed,
    quote: v.quote,
    rating: v.rating === "" ? null : Number(v.rating),
    avatarUrl: v.avatarUrl === "" ? null : v.avatarUrl,
    avatarPathname: v.avatarUrl === "" || v.avatarPathname === "" ? null : v.avatarPathname,
    consentConfirmed: v.consentConfirmed,
  }));

export type TestimonialFormValues = z.input<typeof testimonialSchema>;
export type TestimonialData = z.output<typeof testimonialSchema>;

export const EMPTY_TESTIMONIAL: TestimonialFormValues = {
  name: "",
  serviceUsed: "",
  quote: "",
  rating: "",
  avatarUrl: "",
  avatarPathname: "",
  consentConfirmed: false,
};

/** What the publish action checks on the saved row: consent must be true. */
export const testimonialPublishSchema = z.object({
  consentConfirmed: z.literal(true, CONSENT_TESTIMONIAL),
});

// ---- Partners ----

/** "" or a full https:// address. */
export function websiteIssue(v: string): string | null {
  if (v === "") return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return "Use the https:// address, e.g. https://example.com";
    if (!u.hostname.includes("."))
      return "Enter the full website address, e.g. https://example.com";
    return null;
  } catch {
    return "Enter the full website address, e.g. https://example.com";
  }
}

export const partnerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Add the partner's name")
      .max(TRUST_LIMITS.name, "Keep the name under 80 characters"),
    website: z
      .string()
      .trim()
      .max(TRUST_LIMITS.website, "That address is too long")
      .superRefine((v, ctx) => {
        const issue = websiteIssue(v);
        if (issue) ctx.addIssue({ code: "custom", message: issue });
      }),
    logoUrl: imageUrl,
    logoPathname: z.string().trim().max(300),
    consentConfirmed: z.boolean(),
  })
  .transform((v) => ({
    name: v.name,
    website: v.website === "" ? null : v.website,
    logoUrl: v.logoUrl === "" ? null : v.logoUrl,
    logoPathname: v.logoUrl === "" || v.logoPathname === "" ? null : v.logoPathname,
    consentConfirmed: v.consentConfirmed,
  }));

export type PartnerFormValues = z.input<typeof partnerSchema>;
export type PartnerData = z.output<typeof partnerSchema>;

export const EMPTY_PARTNER: PartnerFormValues = {
  name: "",
  website: "",
  logoUrl: "",
  logoPathname: "",
  consentConfirmed: false,
};

export const partnerPublishSchema = z.object({
  consentConfirmed: z.literal(true, CONSENT_PARTNER),
});

/** New order for a list: every id once, max 200. */
export const trustOrderSchema = z
  .array(trustIdSchema)
  .min(1)
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, "Each item once");
