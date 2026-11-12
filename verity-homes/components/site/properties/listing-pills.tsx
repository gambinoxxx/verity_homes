"use client";

import type { PropertyFilters } from "@/lib/db/queries/properties";
import { withoutKeys } from "@/lib/validation/property-filters";
import { useFilterNav } from "./filter-nav";
import styles from "./properties.module.css";

const PILLS = [
  { type: undefined, label: "All" },
  { type: "sale", label: "For sale" },
  { type: "rent", label: "For rent" },
  { type: "land", label: "Land" },
  { type: "offplan", label: "Off-plan" },
] as const;

/** Listing-type pills. Switching type resets the page and the price (ranges differ per type). */
export function ListingPills({ filters }: { filters: PropertyFilters }) {
  const { navigate } = useFilterNav();
  return (
    <div className={`pills reveal ${styles.pills}`} role="group" aria-label="Listing type">
      {PILLS.map((p) => (
        <button
          key={p.label}
          type="button"
          aria-pressed={filters.type === p.type}
          onClick={() => {
            if (filters.type === p.type) return;
            navigate({ ...withoutKeys(filters, "min", "max", "page"), type: p.type });
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
