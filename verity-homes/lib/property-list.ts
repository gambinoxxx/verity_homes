// Pure helpers for the /properties page: title, price options, results text, page numbers.
import type { PropertyFilters } from "@/lib/db/queries/properties";
import {
  BUDGET_RANGES,
  budgetRangeFor,
  type BudgetListingType,
  type BudgetRange,
} from "./search-ranges";

const TITLE_BY_TYPE: Record<NonNullable<PropertyFilters["type"]> | "all", string> = {
  all: "Properties for sale and rent",
  sale: "Properties for sale",
  rent: "Properties for rent",
  land: "Land for sale",
  offplan: "Off-plan properties",
};

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** "Properties for rent in Lagos", "Land for sale in Ibeju-Lekki"… for <title>. */
export function propertiesListTitle(f: PropertyFilters): string {
  const where = f.area ? titleCase(f.area) : "Lagos";
  return `${TITLE_BY_TYPE[f.type ?? "all"]} in ${where}`;
}

/** Which listing type's budget ranges to offer: rent and land have their own, the rest use sale. */
export function budgetTypeFor(type: PropertyFilters["type"]): BudgetListingType {
  return type === "rent" || type === "land" ? type : "sale";
}

export const nairaLabel = (n: number) => `₦${n.toLocaleString("en-NG")}`;

export type PriceOption = { id: string; label: string; min?: number; max?: number };

/**
 * Price options for the sidebar, plus the selected id. The ranges come from
 * lib/search-ranges.ts (same as the home search). A min/max in the URL that is not one of
 * them (typed by hand, or left over from another listing type) is kept as a "custom" option,
 * so the filter the results use is always the one shown.
 */
export function priceOptions(f: PropertyFilters): { options: PriceOption[]; selected: string } {
  const ranges: readonly BudgetRange[] = BUDGET_RANGES[budgetTypeFor(f.type)];
  const options: PriceOption[] = ranges.map((r) => ({
    id: r.id,
    label: r.label,
    min: r.min,
    max: r.max,
  }));
  if (f.min == null && f.max == null) return { options, selected: "" };
  const match = budgetRangeFor(budgetTypeFor(f.type), f.min, f.max);
  if (match) return { options, selected: match.id };
  const label =
    f.max == null
      ? `${nairaLabel(f.min ?? 0)} and above`
      : f.min == null || f.min === 0
        ? `Up to ${nairaLabel(f.max)}`
        : `${nairaLabel(f.min)} – ${nairaLabel(f.max)}`;
  return {
    options: [...options, { id: "custom", label, min: f.min, max: f.max }],
    selected: "custom",
  };
}

/** "Showing 6 properties" or, past one page, "Showing 13–24 of 30 properties". */
export function resultsLabel(total: number, page: number, perPage: number): string {
  const noun = total === 1 ? "property" : "properties";
  if (total <= perPage) return `Showing ${total} ${noun}`;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);
  return `Showing ${from}–${to} of ${total} ${noun}`;
}

/** Page numbers to show, with null for a gap: 1 … 4 5 6 … 12. */
export function pageNumbers(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const keep = new Set([1, pageCount, page - 1, page, page + 1]);
  const out: (number | null)[] = [];
  for (let n = 1; n <= pageCount; n++) {
    if (keep.has(n)) out.push(n);
    else if (out[out.length - 1] !== null) out.push(null);
  }
  return out;
}
