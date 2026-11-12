"use client";

import type { PropertyFilters } from "@/lib/db/queries/properties";
import { SORT_PARAMS, withoutKeys } from "@/lib/validation/property-filters";
import { useFilterNav } from "./filter-nav";

const LABELS: Record<(typeof SORT_PARAMS)[number], string> = {
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function SortSelect({ filters }: { filters: PropertyFilters }) {
  const { navigate } = useFilterNav();
  return (
    <>
      <label className="sr-only" htmlFor="sort">
        Sort by
      </label>
      <select
        id="sort"
        value={filters.sort ?? "newest"}
        onChange={(e) => {
          const sort = SORT_PARAMS.find((s) => s === e.target.value) ?? "newest";
          navigate({ ...withoutKeys(filters, "page"), sort });
        }}
      >
        {SORT_PARAMS.map((s) => (
          <option key={s} value={s}>
            {LABELS[s]}
          </option>
        ))}
      </select>
    </>
  );
}
