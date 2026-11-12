// /blog URL params ⇄ BlogFilters. Each param is parsed on its own and falls back to "not set"
// when invalid, so a bad URL never throws and never discards the other, valid params.
import { z } from "zod";

export type BlogFilters = { category?: string; q?: string; page?: number };
export type SearchParamsInput = Record<string, string | string[] | undefined>;

const MAX_PAGE = 10_000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const fields = {
  // Category slugs are lowercase words joined by hyphens (lib/slug.ts).
  category: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional()
    .catch(undefined),
  q: z
    .string()
    .trim()
    .max(100)
    .transform((s) => s || undefined)
    .optional()
    .catch(undefined),
  page: z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(MAX_PAGE))
    .optional()
    .catch(undefined),
};

/** URL search params → filters. Invalid values are dropped; never throws. */
export function parseBlogFilters(input: SearchParamsInput): BlogFilters {
  const out: BlogFilters = {
    category: fields.category.parse(first(input.category)),
    q: fields.q.parse(first(input.q)),
    page: fields.page.parse(first(input.page)),
  };
  if (out.page === 1) out.page = undefined;
  // Drop unset keys so the object is a clean cache key.
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as BlogFilters;
}

/** Filters → "/blog?…" (page 1 and unset values left out, so equal filters give equal URLs). */
export function blogHref(f: BlogFilters, hash = ""): string {
  const p = new URLSearchParams();
  if (f.category) p.set("category", f.category);
  if (f.q) p.set("q", f.q);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const qs = p.toString();
  return `/blog${qs ? `?${qs}` : ""}${hash}`;
}
