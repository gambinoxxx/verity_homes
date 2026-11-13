// /admin/properties URL params (Unit 14): ?status=published|draft&q=lekki&type=rent&page=2.
// Each param falls back to "not set" on its own, so a bad URL never throws.
import { z } from "zod";

export const ADMIN_STATUS_TABS = ["all", "published", "draft"] as const;
export type AdminStatusTab = (typeof ADMIN_STATUS_TABS)[number];

export const ADMIN_TYPE_PARAM = {
  sale: "SALE",
  rent: "RENT",
  land: "LAND",
  "off-plan": "OFF_PLAN",
} as const;
export type AdminTypeParam = keyof typeof ADMIN_TYPE_PARAM;

export type AdminPropertyFilters = {
  status: AdminStatusTab;
  q: string;
  type: AdminTypeParam | null;
  page: number;
};

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseAdminPropertyFilters(
  params: Record<string, string | string[] | undefined>,
): AdminPropertyFilters {
  const status = z.enum(ADMIN_STATUS_TABS).catch("all").parse(first(params.status));
  const q = z
    .string()
    .trim()
    .max(80)
    .catch("")
    .parse(first(params.q) ?? "");
  const typeRaw = first(params.type);
  const type =
    typeof typeRaw === "string" && typeRaw in ADMIN_TYPE_PARAM ? (typeRaw as AdminTypeParam) : null;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .catch(1)
    .parse(first(params.page) ?? 1);
  return { status, q, type, page };
}

/** URL for the list with some filters changed (page resets unless given). */
export function adminPropertiesHref(
  f: AdminPropertyFilters,
  change: Partial<AdminPropertyFilters> = {},
): string {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (next.status !== "all") sp.set("status", next.status);
  if (next.q) sp.set("q", next.q);
  if (next.type) sp.set("type", next.type);
  if (next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/admin/properties?${qs}` : "/admin/properties";
}
