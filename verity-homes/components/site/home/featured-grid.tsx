"use client";

import { useState } from "react";
import type { PropertyCard as PropertyCardData } from "@/lib/db/queries/properties";
import { PropertyCard } from "../property-card";
import styles from "./featured.module.css";

const FILTERS = [
  { id: "all", label: "All", listing: null },
  { id: "sale", label: "For sale", listing: "SALE" },
  { id: "rent", label: "For rent", listing: "RENT" },
  { id: "land", label: "Land", listing: "LAND" },
  { id: "offplan", label: "Off-plan", listing: "OFF_PLAN" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];
const DELAYS = ["", "d1", "d2"] as const;

/** Filter pills + card grid. Filtering happens on the page, within the featured set. */
export function FeaturedGrid({
  properties,
  children,
}: {
  properties: PropertyCardData[];
  /** Section heading, rendered beside the pills. */
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [changed, setChanged] = useState(false);
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const shown = active.listing
    ? properties.filter((p) => p.listingType === active.listing)
    : properties;

  return (
    <>
      <div className="sec-head">
        {children}
        <div className={`${styles.filters} reveal d2`} role="group" aria-label="Filter properties">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setChanged(true);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Re-keyed per filter so the cards replay their fade-up. */}
      <div key={filter} className={`${styles.grid} ${changed ? styles.changed : ""}`}>
        {shown.map((p, i) => (
          <PropertyCard
            key={p.id}
            property={p}
            className={changed ? "" : `reveal ${DELAYS[i % 3]}`}
          />
        ))}
        {shown.length === 0 ? (
          <p className={styles.empty}>
            {properties.length === 0
              ? "No featured properties yet. See all listings below."
              : `No featured ${active.label.toLowerCase()} listings right now.`}
          </p>
        ) : null}
      </div>
    </>
  );
}
