// Site settings form (Unit 19a), shared by /admin/settings (zodResolver) and
// lib/actions/settings.ts. Input = the form's strings; output = the SiteSettings columns.
import { z } from "zod";
import { unsafeLinkIn } from "@/lib/post-content";

export const SETTINGS_LIMITS = {
  phone: 30,
  email: 120,
  officeArea: 80,
  officeAddress: 200,
  mapQuery: 200,
  companyName: 120,
  rcNumber: 10,
  openingHours: 200,
  url: 300,
  ceoBio: 5000,
  ceoPromise: 200,
  companyStory: 5000,
} as const;

/**
 * A Nigerian mobile number as WhatsApp needs it: digits only, 234 + 10 digits.
 * "0803 123 4567", "+234 803 123 4567" and "2348031234567" → "2348031234567"; null if it
 * can't be one.
 */
export function normaliseWhatsapp(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (/^0\d{10}$/.test(d)) return `234${d.slice(1)}`;
  if (/^234\d{10}$/.test(d)) return d;
  return null;
}

/**
 * True when a map search looks like a street address ("7 Hidden Close", "No. 12 Adeola
 * Street") rather than an area or landmark — the contact map is public (Q37).
 */
export function looksLikeStreetAddress(q: string): boolean {
  const s = q.trim();
  // A house number opening the address (or a comma-separated part): "7 Hidden Close",
  // "No. 12 Adeola…", "Ikeja, 3 Allen…" — but not "Lekki Phase 1".
  if (/(^|,\s*)(no\.?\s*)?\d{1,4}[a-z]?\s+\p{L}/iu.test(s)) return true;
  const street =
    /\b(street|st\.|close|crescent|cres\.|avenue|ave\.|lane|drive|road|rd\.|way)\b/i.test(s);
  return street && /\d/.test(s);
}

export const SOCIALS = ["instagram", "facebook", "x", "linkedin"] as const;
export type SocialKey = (typeof SOCIALS)[number];

export const SOCIAL_HOSTS: Record<SocialKey, { label: string; hosts: string[]; example: string }> =
  {
    instagram: {
      label: "Instagram",
      hosts: ["instagram.com"],
      example: "https://www.instagram.com/verityhomes",
    },
    facebook: {
      label: "Facebook",
      hosts: ["facebook.com", "fb.com"],
      example: "https://www.facebook.com/verityhomes",
    },
    x: { label: "X", hosts: ["x.com", "twitter.com"], example: "https://x.com/verityhomes" },
    linkedin: {
      label: "LinkedIn",
      hosts: ["linkedin.com"],
      example: "https://www.linkedin.com/company/verityhomes",
    },
  };

/** "" or a full https:// address on the network's own site. */
export function socialUrlIssue(key: SocialKey, v: string): string | null {
  if (v === "") return null;
  const { label, hosts, example } = SOCIAL_HOSTS[key];
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return `Paste the full address, e.g. ${example}`;
  }
  if (u.protocol !== "https:") return `Use the https:// address, e.g. ${example}`;
  const host = u.hostname.toLowerCase();
  if (!hosts.some((h) => host === h || host.endsWith(`.${h}`)))
    return `That isn't a ${label} address — e.g. ${example}`;
  return null;
}

const text = (max: number, msg: string) => z.string().trim().max(max, msg);
const markdown = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .refine(
      (v) => unsafeLinkIn(v) === null,
      "Links can't use javascript:, vbscript: or data: addresses. Use a normal https:// link.",
    );

const social = (key: SocialKey) =>
  text(SETTINGS_LIMITS.url, "That address is too long").superRefine((v, ctx) => {
    const issue = socialUrlIssue(key, v);
    if (issue) ctx.addIssue({ code: "custom", message: issue });
  });

const nullable = (v: string) => (v === "" ? null : v);

export const settingsSchema = z
  .object({
    // ---- Contact ----
    phone: text(SETTINGS_LIMITS.phone, "Keep the phone number under 30 characters").refine(
      (v) =>
        v === "" ||
        (/^[\d\s+()-]+$/.test(v) &&
          v.replace(/\D/g, "").length >= 7 &&
          v.replace(/\D/g, "").length <= 15),
      "Enter a phone number, e.g. 0803 123 4567 or +234 803 123 4567",
    ),
    whatsapp: text(30, "Enter a Nigerian mobile number, e.g. 0803 123 4567").refine(
      (v) => v === "" || normaliseWhatsapp(v) !== null,
      "Enter a Nigerian mobile number, e.g. 0803 123 4567 or +234 803 123 4567",
    ),
    email: text(SETTINGS_LIMITS.email, "That email is too long").refine(
      (v) => v === "" || z.email().safeParse(v).success,
      "Enter an email address, e.g. info@verityhomes.com.ng",
    ),
    // ---- Office ----
    officeArea: text(SETTINGS_LIMITS.officeArea, "Keep the area under 80 characters").pipe(
      z.string().min(1, "Add the area, e.g. Onipanu, Lagos State"),
    ),
    officeAddress: text(SETTINGS_LIMITS.officeAddress, "Keep the address under 200 characters"),
    showFullAddress: z.boolean(),
    mapQuery: text(SETTINGS_LIMITS.mapQuery, "Keep the map search under 200 characters").pipe(
      z.string().min(1, "Add what the map should show, e.g. Onipanu, Lagos"),
    ),
    // ---- Company ----
    companyName: text(SETTINGS_LIMITS.companyName, "Keep the name under 120 characters").pipe(
      z.string().min(1, "Add the registered company name"),
    ),
    rcNumber: z
      .string()
      .trim()
      .refine((v) => /^\d{1,10}$/.test(v), "Digits only, e.g. 9971213"),
    openingHours: text(SETTINGS_LIMITS.openingHours, "Keep the hours under 200 characters"),
    // ---- Social ----
    instagram: social("instagram"),
    facebook: social("facebook"),
    x: social("x"),
    linkedin: social("linkedin"),
    // ---- Content ----
    ceoBio: markdown(SETTINGS_LIMITS.ceoBio, "Keep the bio under 5,000 characters"),
    ceoPromise: text(SETTINGS_LIMITS.ceoPromise, "Keep the promise under 200 characters").refine(
      (v) => !/[\r\n]/.test(v),
      "Keep the promise to one line",
    ),
    companyStory: markdown(SETTINGS_LIMITS.companyStory, "Keep the story under 5,000 characters"),
  })
  .superRefine((v, ctx) => {
    if (v.showFullAddress && v.officeAddress === "")
      ctx.addIssue({
        code: "custom",
        path: ["officeAddress"],
        message: "Add the office address, or turn off “Show full address publicly”",
      });
  })
  .transform((v) => ({
    phone: nullable(v.phone),
    whatsapp: v.whatsapp === "" ? null : normaliseWhatsapp(v.whatsapp),
    email: nullable(v.email.toLowerCase()),
    officeArea: v.officeArea,
    officeAddress: nullable(v.officeAddress),
    showFullAddress: v.showFullAddress,
    mapQuery: v.mapQuery,
    companyName: v.companyName,
    rcNumber: v.rcNumber,
    openingHours: nullable(v.openingHours),
    instagram: nullable(v.instagram),
    facebook: nullable(v.facebook),
    x: nullable(v.x),
    linkedin: nullable(v.linkedin),
    ceoBio: nullable(v.ceoBio),
    ceoPromise: nullable(v.ceoPromise),
    companyStory: nullable(v.companyStory),
  }));

export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsData = z.output<typeof settingsSchema>;

/** Field labels in form order (error summary). */
export const SETTINGS_FIELD_LABEL: Record<keyof SettingsFormValues, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
  officeArea: "Office area",
  officeAddress: "Office address",
  showFullAddress: "Show full address",
  mapQuery: "Map search",
  companyName: "Company name",
  rcNumber: "RC number",
  openingHours: "Opening hours",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  linkedin: "LinkedIn",
  ceoBio: "CEO bio",
  ceoPromise: "CEO promise",
  companyStory: "Company story",
};

/** The panels (and their anchors on /admin/settings, used by the dashboard checklist). */
export const SETTINGS_PANELS = {
  contact: "contact",
  office: "office",
  company: "company",
  social: "social",
  content: "content",
  privacy: "privacy",
} as const;
