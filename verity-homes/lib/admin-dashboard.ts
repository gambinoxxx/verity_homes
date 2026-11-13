// Admin dashboard (Unit 13, design/admin.html): pure helpers, unit-tested. Data comes from
// lib/db/queries/admin.ts.
import { INTEREST_LABEL } from "@/lib/format";

/**
 * Admin pages that exist. Add each route in the unit that builds it; until then, quick actions
 * and the top bar's "Add property" show "Coming soon" instead of a link to a missing page.
 */
export const BUILT_ADMIN_ROUTES: ReadonlySet<string> = new Set([
  "/admin",
  "/admin/properties", // Unit 14
  "/admin/properties/new", // Unit 14
  "/admin/enquiries", // Unit 16
  "/admin/plans", // Unit 17
  "/admin/plans/new", // Unit 17
  "/admin/faqs", // Unit 17
]);

/** Public pages (e.g. /privacy) count as built; admin paths must be in the list. */
export function isAdminRouteBuilt(href: string, built = BUILT_ADMIN_ROUTES): boolean {
  const path = href.split(/[?#]/)[0] ?? href;
  if (path !== "/admin" && !path.startsWith("/admin/")) return true;
  return built.has(path);
}

export const ADD_PROPERTY_HREF = "/admin/properties/new";

export type QuickAction = {
  label: string;
  href: string;
  icon: "plus" | "pen" | "chart" | "gear";
};

export const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "Add a property", href: ADD_PROPERTY_HREF, icon: "plus" },
  { label: "Write a blog post", href: "/admin/posts/new", icon: "pen" }, // Unit 18
  { label: "Edit investment plans", href: "/admin/plans", icon: "chart" },
  { label: "Update contact details", href: "/admin/settings", icon: "gear" }, // Unit 19
];

/** Link to one enquiry in the enquiries inbox (Unit 16 opens it from ?id=). */
export function enquiryHref(id: string): string {
  return `/admin/enquiries?id=${encodeURIComponent(id)}`;
}

/** "Buying · Contemporary Detached Duplex", "Investing · Plan: Starter", or just "Land". */
export function enquirySubject(e: {
  interest: keyof typeof INTEREST_LABEL;
  propertyTitle: string | null;
  planName: string | null;
}): string {
  const parts: string[] = [INTEREST_LABEL[e.interest]];
  if (e.propertyTitle) parts.push(e.propertyTitle);
  else if (e.planName) parts.push(`Plan: ${e.planName}`);
  return parts.join(" · ");
}

export const ENQUIRY_STATUS_LABEL = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
} as const;

export type EnquiryStatus = keyof typeof ENQUIRY_STATUS_LABEL;

// ---- Setup checklist ----

export type SetupStatus = {
  whatsappSet: boolean;
  emailSet: boolean;
  /** Published properties whose title does not start with "[SAMPLE]". */
  realPublishedProperties: number;
  privacyReviewed: boolean;
};

export type ChecklistItem = {
  key: "whatsapp" | "email" | "property" | "privacy";
  label: string;
  hint: string;
  href: string;
};

const SETTINGS_HREF = "/admin/settings"; // Unit 19

/** What's still missing before launch, in order. Empty → the card is hidden. */
export function setupChecklist(s: SetupStatus): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  if (!s.whatsappSet)
    items.push({
      key: "whatsapp",
      label: "Add your WhatsApp number",
      hint: "The WhatsApp buttons stay hidden until it's set.",
      href: SETTINGS_HREF,
    });
  if (!s.emailSet)
    items.push({
      key: "email",
      label: "Add your contact email",
      hint: "Shown on the contact and privacy pages.",
      href: SETTINGS_HREF,
    });
  if (s.realPublishedProperties < 1)
    items.push({
      key: "property",
      label: "Publish your first real property",
      hint: "Only [SAMPLE] listings are live so far.",
      href: ADD_PROPERTY_HREF,
    });
  if (!s.privacyReviewed)
    items.push({
      key: "privacy",
      label: "Review the privacy notice",
      hint: "It's still a draft. Have it checked before launch (open question Q39).",
      href: "/privacy",
    });
  return items;
}

/** "[SAMPLE] …" titles are seed data (context/ai-workflow-rules.md), not real listings. */
export const SAMPLE_PREFIX = "[SAMPLE]";
