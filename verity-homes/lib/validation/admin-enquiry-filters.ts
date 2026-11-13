// /admin/enquiries URL params (Unit 16): ?status=new&q=ada&interest=buying&page=2&id=<id>.
// Each param falls back to "not set" on its own, so a bad URL never throws.
import { z } from "zod";

export const ENQUIRY_TABS = ["all", "new", "contacted", "closed"] as const;
export type EnquiryTab = (typeof ENQUIRY_TABS)[number];

export const INTEREST_PARAM = {
  buying: "BUYING",
  renting: "RENTING",
  land: "LAND",
  investing: "INVESTING",
  management: "MANAGEMENT",
  development: "DEVELOPMENT",
  listing: "LISTING",
  other: "OTHER",
} as const;
export type InterestParam = keyof typeof INTEREST_PARAM;

export const TAB_STATUS = { new: "NEW", contacted: "CONTACTED", closed: "CLOSED" } as const;

export type EnquiryFilters = {
  status: EnquiryTab;
  q: string;
  interest: InterestParam | null;
  page: number;
  /** The open enquiry (detail panel); the dashboard links here with ?id=. */
  id: string | null;
};

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseEnquiryFilters(
  params: Record<string, string | string[] | undefined>,
): EnquiryFilters {
  const status = z.enum(ENQUIRY_TABS).catch("all").parse(first(params.status));
  const q = z
    .string()
    .trim()
    .max(80)
    .catch("")
    .parse(first(params.q) ?? "");
  const raw = first(params.interest);
  const interest = typeof raw === "string" && raw in INTEREST_PARAM ? (raw as InterestParam) : null;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .catch(1)
    .parse(first(params.page) ?? 1);
  const id = z
    .string()
    .regex(/^[a-z0-9]{8,40}$/)
    .nullable()
    .catch(null)
    .parse(first(params.id) ?? null);
  return { status, q, interest, page, id };
}

function params(f: EnquiryFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.status !== "all") sp.set("status", f.status);
  if (f.q) sp.set("q", f.q);
  if (f.interest) sp.set("interest", f.interest);
  if (f.page > 1) sp.set("page", String(f.page));
  if (f.id) sp.set("id", f.id);
  return sp;
}

/** List URL with some filters changed. Changing a filter resets the page and closes the detail. */
export function enquiriesHref(f: EnquiryFilters, change: Partial<EnquiryFilters> = {}): string {
  const filterChanged = ["status", "q", "interest"].some((k) => k in change);
  const next: EnquiryFilters = {
    ...f,
    ...(filterChanged ? { page: 1, id: null } : {}),
    ...change,
  };
  const qs = params(next).toString();
  return qs ? `/admin/enquiries?${qs}` : "/admin/enquiries";
}

/** CSV export URL for the current filters (all matching rows: no page, no id). */
export function enquiriesCsvHref(f: EnquiryFilters): string {
  const qs = params({ ...f, page: 1, id: null }).toString();
  return qs ? `/api/admin/enquiries/export?${qs}` : "/api/admin/enquiries/export";
}
