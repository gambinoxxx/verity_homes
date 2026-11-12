// /properties URL params ⇄ PropertyFilters. Shared by the page (server) and the filter UI
// (client). Matches what the home search sends (lib/search.ts): type, area, ptype, min, max.
// Every param is parsed on its own and falls back to "not set" if invalid — a bad URL never
// throws and never discards the other, valid params.
import { z } from "zod";
import type { PropertyCard, PropertyFilters } from "@/lib/db/queries/properties";

type PropertyType = PropertyCard["propertyType"];
type TitleDocument = NonNullable<PropertyCard["titleDocument"]>;
type ListingParam = NonNullable<PropertyFilters["type"]>;
type SortParam = NonNullable<PropertyFilters["sort"]>;

export const LISTING_PARAMS = [
  "sale",
  "rent",
  "land",
  "offplan",
] as const satisfies readonly ListingParam[];
export const SORT_PARAMS = [
  "newest",
  "price-asc",
  "price-desc",
] as const satisfies readonly SortParam[];
export const PROPERTY_TYPES = [
  "DETACHED",
  "SEMI_DETACHED",
  "TERRACE",
  "APARTMENT",
  "BUNGALOW",
  "LAND",
  "COMMERCIAL",
] as const satisfies readonly PropertyType[];
export const TITLE_DOCUMENTS = [
  "C_OF_O",
  "GOVERNORS_CONSENT",
  "REGISTERED_DEED",
  "EXCISION",
  "OTHER",
] as const satisfies readonly TitleDocument[];

export const MAX_BEDS_FILTER = 5;
const MAX_NAIRA = 1_000_000_000_000; // ₦1 trillion: anything above is a typo or an attack
const MAX_PAGE = 10_000;

export type SearchParamsInput = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => s || undefined)
    .optional()
    .catch(undefined);
const int = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))
    .optional()
    .catch(undefined);

const fields = {
  type: z.enum(LISTING_PARAMS).optional().catch(undefined),
  q: text(100),
  area: text(80),
  ptype: z.enum(PROPERTY_TYPES).optional().catch(undefined),
  min: int(0, MAX_NAIRA),
  max: int(0, MAX_NAIRA),
  beds: int(0, MAX_BEDS_FILTER),
  sort: z.enum(SORT_PARAMS).optional().catch(undefined),
  page: int(1, MAX_PAGE),
};

/** URL search params → filters. Invalid values are dropped; never throws. */
export function parsePropertyFilters(input: SearchParamsInput): PropertyFilters {
  const out: PropertyFilters = {};
  out.type = fields.type.parse(first(input.type));
  out.q = fields.q.parse(first(input.q));
  out.area = fields.area.parse(first(input.area));
  out.ptype = fields.ptype.parse(first(input.ptype));
  out.min = fields.min.parse(first(input.min));
  out.max = fields.max.parse(first(input.max));
  // A reversed range can't match anything: treat it as no price filter.
  if (out.min != null && out.max != null && out.min > out.max) out.min = out.max = undefined;
  const beds = fields.beds.parse(first(input.beds));
  out.beds = beds ? beds : undefined; // 0 = any
  // title=C_OF_O&title=EXCISION or title=C_OF_O,EXCISION; unknown values are skipped.
  const rawTitles = [input.title ?? []].flat().flatMap((t) => t.split(","));
  const titles = [...new Set(rawTitles.map((t) => t.trim()))].filter((t): t is TitleDocument =>
    (TITLE_DOCUMENTS as readonly string[]).includes(t),
  );
  out.title = titles.length ? titles : undefined;
  out.sort = fields.sort.parse(first(input.sort));
  out.page = fields.page.parse(first(input.page));
  // Drop unset keys so the object is a clean cache key and serialises predictably.
  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  ) as PropertyFilters;
}

/**
 * Filters → query string (no leading "?"). Defaults are left out (sort=newest, page=1) so
 * equal filters always give the same URL.
 */
export function propertyFiltersToQuery(f: PropertyFilters): string {
  const p = new URLSearchParams();
  if (f.type) p.set("type", f.type);
  if (f.q) p.set("q", f.q);
  if (f.area) p.set("area", f.area);
  if (f.ptype) p.set("ptype", f.ptype);
  if (f.min != null) p.set("min", String(f.min));
  if (f.max != null) p.set("max", String(f.max));
  if (f.beds) p.set("beds", String(f.beds));
  for (const t of f.title ?? []) p.append("title", t);
  if (f.sort && f.sort !== "newest") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  return p.toString();
}

/** `/properties` URL for these filters. */
export function propertiesHref(f: PropertyFilters, hash = ""): string {
  const q = propertyFiltersToQuery(f);
  return `/properties${q ? `?${q}` : ""}${hash}`;
}

/** Copy of the filters without some keys (e.g. reset `page` when a filter changes). */
export function withoutKeys(
  f: PropertyFilters,
  ...keys: (keyof PropertyFilters)[]
): PropertyFilters {
  const copy = { ...f };
  for (const k of keys) delete copy[k];
  return copy;
}
