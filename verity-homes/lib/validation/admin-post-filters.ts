// /admin/posts URL params (Unit 18): ?status=published|draft&q=tenant&category=renting&page=2.
// Each param falls back to "not set" on its own, so a bad URL never throws.
import { z } from "zod";
import { ADMIN_STATUS_TABS, type AdminStatusTab } from "./admin-property-filters";

export type AdminPostFilters = {
  status: AdminStatusTab;
  q: string;
  /** Category slug, or null for every category. */
  category: string | null;
  page: number;
};

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export function parseAdminPostFilters(
  params: Record<string, string | string[] | undefined>,
): AdminPostFilters {
  const status = z.enum(ADMIN_STATUS_TABS).catch("all").parse(first(params.status));
  const q = z
    .string()
    .trim()
    .max(80)
    .catch("")
    .parse(first(params.q) ?? "");
  const category = z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .nullable()
    .catch(null)
    .parse(first(params.category) ?? null);
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(10_000)
    .catch(1)
    .parse(first(params.page) ?? 1);
  return { status, q, category, page };
}

/** URL for the list with some filters changed (page resets unless given). */
export function adminPostsHref(
  f: AdminPostFilters,
  change: Partial<AdminPostFilters> = {},
): string {
  const next = { ...f, page: 1, ...change };
  const sp = new URLSearchParams();
  if (next.status !== "all") sp.set("status", next.status);
  if (next.q) sp.set("q", next.q);
  if (next.category) sp.set("category", next.category);
  if (next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `/admin/posts?${qs}` : "/admin/posts";
}
