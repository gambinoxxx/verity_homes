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
import { LEAD_SOURCE_FIELDS, describeSource, type LeadSource } from "@/lib/lead-source";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { enquirySchema, type EnquiryInput } from "@/lib/validation/enquiry";

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
    "You've sent several enquiries in the last hour — please WhatsApp us and we'll reply there.",
  failed: "Sorry, we couldn't send your enquiry. Please try again or chat with us on WhatsApp.",
} as const;

/**
 * Every refusal is logged with a short reason and the form type — never names, phones, emails,
 * messages or IP — so a failed enquiry is visible in the Vercel logs (25 Nov 2026: a refused
 * enquiry left no trace). Expected refusals (bot checks, rate limit, typos) are warnings;
 * anything unexpected is an error.
 */
function refused(level: "warn" | "error", reason: string, source: unknown): void {
  const form = typeof source === "string" ? source.slice(0, 20) : "unknown";
  console[level](`enquiry refused: ${reason} (form ${form})`);
}

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
      if (issues.some((i) => i.path[0] === HONEYPOT_FIELD)) {
        refused("warn", "honeypot filled", raw.source);
        return { ok: false, error: MESSAGES.failed };
      }
      const fieldErrors: Partial<Record<EnquiryField, string>> = {};
      for (const issue of issues) {
        const key = issue.path[0];
        if (typeof key === "string" && (FIELDS as readonly string[]).includes(key)) {
          fieldErrors[key as EnquiryField] ??= issue.message;
        }
      }
      if (Object.keys(fieldErrors).length) {
        refused("warn", `invalid ${Object.keys(fieldErrors).join(", ")}`, raw.source);
        return { ok: false, error: MESSAGES.check, fieldErrors };
      }
      // Only the minimum fill time (or a hidden field) failed.
      if (issues.some((i) => i.path[0] === "startedAt")) {
        refused("warn", "sent too fast", raw.source);
        return { ok: false, error: MESSAGES.tooFast };
      }
      const hidden = [...new Set(issues.map((i) => `${String(i.path[0])}:${i.code}`))].join(", ");
      refused("error", `hidden field rejected ${hidden.slice(0, 200)}`, raw.source);
      return { ok: false, error: MESSAGES.failed };
    }
    const input = parsed.data;

    let amountKobo: bigint | null = null;
    if (input.amount?.trim()) {
      try {
        amountKobo = koboFromNaira(input.amount);
      } catch {
        refused("warn", "invalid amount", input.source);
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
    if (recent >= RATE_LIMIT) {
      refused("warn", "rate limited", input.source);
      return { ok: false, error: MESSAGES.rateLimited };
    }

    // Links must point at published content; anything else is dropped, the enquiry still counts.
    const [property, plan, plot, pkg] = await Promise.all([
      input.propertyId ? findPublishedPropertyRef(input.propertyId) : null,
      input.planId ? findPublishedPlanRef(input.planId) : null,
      input.plotId && input.propertyId ? findPlotRef(input.plotId, input.propertyId) : null,
      input.packageId && input.planId ? findPackageRef(input.packageId, input.planId) : null,
    ]);

    const lead: LeadSource = Object.fromEntries(
      LEAD_SOURCE_FIELDS.map((k) => [k, input[k] ?? null]),
    );

    // 3. Save first.
    const saved = await saveEnquiry({
      ...lead,
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

    // 4. Then email. Once the enquiry is saved the visitor ALWAYS sees success: an email
    // problem (or anything else from here on) is logged and the enquiry stays in the inbox
    // with emailSentAt = null.
    try {
      await notify(saved, input, amountKobo, property, plan, describeSource(lead));
    } catch (e) {
      console.error(
        `Enquiry ${saved.id}: saved, but the notification step failed (${e instanceof Error ? e.message : "unknown error"})`,
      );
    }
    return { ok: true, message: MESSAGES.sent };
  } catch (e) {
    console.error(`createEnquiry failed: ${e instanceof Error ? e.message : "unknown error"}`);
    return { ok: false, error: MESSAGES.failed };
  }
}

async function notify(
  saved: { id: string; createdAt: Date },
  input: EnquiryInput,
  amountKobo: bigint | null,
  property: Awaited<ReturnType<typeof findPublishedPropertyRef>>,
  plan: Awaited<ReturnType<typeof findPublishedPlanRef>>,
  leadSource: string | null,
): Promise<void> {
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
    leadSource,
  });
  if (sent) {
    await markEnquiryEmailSent(saved.id).catch((e: unknown) =>
      console.error(
        `Enquiry ${saved.id}: could not record emailSentAt (${e instanceof Error ? e.message : e})`,
      ),
    );
  }
}
