// Home search bar → URL. Unit 5 parses these params (type, area, ptype, min, max) with Zod.
import { findBudgetRange, type BudgetListingType } from "./search-ranges";

export type SearchTab = "buy" | "rent" | "land" | "invest";

export const SEARCH_TABS: readonly { id: SearchTab; label: string }[] = [
  { id: "buy", label: "Buy" },
  { id: "rent", label: "Rent" },
  { id: "land", label: "Land" },
  { id: "invest", label: "Invest" },
];

/** Property types offered in the home search (design/index.html), as PropertyType values. */
export const SEARCH_PROPERTY_TYPES = [
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-detached" },
  { value: "TERRACE", label: "Terrace" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "LAND", label: "Land" },
] as const;

export const TYPE_PARAM: Record<Exclude<SearchTab, "invest">, BudgetListingType> = {
  buy: "sale",
  rent: "rent",
  land: "land",
};

/**
 * Where the search form goes. Empty fields are left out; the Invest tab goes to /invest.
 * `budget` is a range id from lib/search-ranges.ts for the tab's listing type: it becomes
 * `min` and `max` in naira (no `max` for "Above …"). Unknown ids are ignored.
 */
export function searchHref(
  tab: SearchTab,
  fields: { area?: string; ptype?: string; budget?: string },
): string {
  if (tab === "invest") return "/invest";
  const type = TYPE_PARAM[tab];
  const params = new URLSearchParams({ type });
  const area = fields.area?.trim();
  if (area) params.set("area", area);
  if (fields.ptype) params.set("ptype", fields.ptype);
  const range = fields.budget ? findBudgetRange(type, fields.budget) : undefined;
  if (range) {
    params.set("min", String(range.min));
    if (range.max !== undefined) params.set("max", String(range.max));
  }
  return `/properties?${params.toString()}`;
}
