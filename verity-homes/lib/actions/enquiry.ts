"use server";

// createEnquiry: the enquiry pipeline used on the home, property, invest and contact pages.
// Order (architecture invariant 5): validate → rate limit → save → email. The enquiry is
// saved before the email is attempted; if the email fails it is kept with emailSentAt = null.
// Only friendly messages are returned — never raw errors.
import { headers } from "next/headers";
import { koboFromNaira } from "@/lib/format";
import { clientIp, hashIp } from "@/lib/ip-hash";
import {
  countEnquiriesSince,
  findPublishedPlanRef,
  findPackageRef,
  findPlotRef,
  findPublishedPropertyRef,
  markEnquiryEmailSent,
  saveEnquiry,
} from "@/lib/db/mutations/enquiries";
import { sendEnquiryEmail } from "@/lib/email/enquiry";
import { enquirySchema } from "@/lib/validation/enquiry";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const FIELDS = ["name", "phone", "email", "message", "amount"] as const;
export type EnquiryField = (typeof FIELDS)[number];

export type EnquiryState =
  | null
  | { ok: true; message: string }
  | { ok: false; error?: string; fieldErrors?: Partial<Record<EnquiryField, string>> };

const MESSAGES = {
  sent: "Thank you — we've received your enquiry and will be in touch shortly.",
  check: "Please check the highlighted fields.",
  tooFast: "That was quick! Please check your details and press send again.",
  rateLimited:
    "You've sent several messages already — please try again in an hour or chat with us on WhatsApp.",
  failed: "Sorry, we couldn't send your enquiry. Please try again or chat with us on WhatsApp.",
} as const;

export async function createEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  try {
    // 1. Validate. Blank optional fields arrive as "" — treat them as missing.
    const raw = Object.fromEntries(
      [...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
    const parsed = enquirySchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      // Honeypot filled: a bot. Nothing is saved.
      if (issues.some((i) => i.path[0] === "company")) return { ok: false, error: MESSAGES.failed };
      const fieldErrors: Partial<Record<EnquiryField, string>> = {};
      for (const issue of issues) {
        const key = issue.path[0];
        if (typeof key === "string" && (FIELDS as readonly string[]).includes(key)) {
          fieldErrors[key as EnquiryField] ??= issue.message;
        }
      }
      if (Object.keys(fieldErrors).length) return { ok: false, error: MESSAGES.check, fieldErrors };
      // Only the minimum fill time (or a tampered hidden field) failed.
      return {
        ok: false,
        error: issues.some((i) => i.path[0] === "startedAt") ? MESSAGES.tooFast : MESSAGES.failed,
      };
    }
    const input = parsed.data;

    let amountKobo: bigint | null = null;
    if (input.amount?.trim()) {
      try {
        amountKobo = koboFromNaira(input.amount);
      } catch {
        return {
          ok: false,
          error: MESSAGES.check,
          fieldErrors: { amount: "Enter a valid amount in naira" },
        };
      }
    }

    // 2. Rate limit: 5 saved enquiries per IP hash per hour.
    const ipHash = hashIp(clientIp(await headers()));
    const recent = await countEnquiriesSince(ipHash, new Date(Date.now() - RATE_WINDOW_MS));
    if (recent >= RATE_LIMIT) return { ok: false, error: MESSAGES.rateLimited };

    // Links must point at published content; anything else is dropped, the enquiry still counts.
    const [property, plan, plot, pkg] = await Promise.all([
      input.propertyId ? findPublishedPropertyRef(input.propertyId) : null,
      input.planId ? findPublishedPlanRef(input.planId) : null,
      input.plotId && input.propertyId ? findPlotRef(input.plotId, input.propertyId) : null,
      input.packageId && input.planId ? findPackageRef(input.packageId, input.planId) : null,
    ]);

    // 3. Save first.
    const saved = await saveEnquiry({
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      interest: input.interest,
      message: input.message,
      source: input.source,
      propertyId: property?.id ?? null,
      planId: plan?.id ?? null,
      plotId: property && plot ? plot.id : null,
      packageId: plan && pkg ? pkg.id : null,
      wantsInspection: input.wantsInspection,
      amountKobo,
      ipHash,
    });

    // 4. Then email. A failure is logged inside sendEnquiryEmail; the enquiry is kept.
    const sent = await sendEnquiryEmail({
      id: saved.id,
      createdAt: saved.createdAt,
      name: input.name,
      phone: input.phone,
      email: input.email,
      interest: input.interest,
      source: input.source,
      message: input.message,
      wantsInspection: input.wantsInspection,
      amountKobo,
      property,
      plan,
    });
    if (sent) {
      await markEnquiryEmailSent(saved.id).catch((e: unknown) =>
        console.error(
          `Enquiry ${saved.id}: could not record emailSentAt (${e instanceof Error ? e.message : e})`,
        ),
      );
    }
    return { ok: true, message: MESSAGES.sent };
  } catch (e) {
    console.error(`createEnquiry failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return { ok: false, error: MESSAGES.failed };
  }
}
