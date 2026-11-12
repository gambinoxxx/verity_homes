"use client";

import Link from "next/link";
import { useState } from "react";
import type { PropertyFilters } from "@/lib/db/queries/properties";
import { budgetTypeFor, priceOptions } from "@/lib/property-list";
import { PROPERTY_TYPES, TITLE_DOCUMENTS, withoutKeys } from "@/lib/validation/property-filters";
import { FilterIcon, SearchIcon } from "../icons";
import { useFilterNav } from "./filter-nav";
import styles from "./properties.module.css";

// Options as in design/properties.html.
const TYPE_OPTIONS: { value: (typeof PROPERTY_TYPES)[number]; label: string }[] = [
  { value: "DETACHED", label: "Detached" },
  { value: "SEMI_DETACHED", label: "Semi-detached" },
  { value: "TERRACE", label: "Terrace" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "BUNGALOW", label: "Bungalow" },
  { value: "LAND", label: "Land" },
];
const BED_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
];
const TITLE_OPTIONS: { value: (typeof TITLE_DOCUMENTS)[number]; label: string }[] = [
  { value: "C_OF_O", label: "C of O" },
  { value: "GOVERNORS_CONSENT", label: "Governor's Consent" },
  { value: "REGISTERED_DEED", label: "Registered Deed" },
];

type FilterSidebarProps = { filters: PropertyFilters; areas: readonly string[] };

/**
 * "Refine your search" card + "Can't find it?" card. Fields start from the URL; "Show
 * results" pushes the new URL. On mobile the card is hidden behind a "Filters" button.
 */
export function FilterSidebar({ filters, areas }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={styles.side} data-open={open}>
      <button
        type="button"
        className={`btn btn-outline-dark ${styles.mobileFilter}`}
        aria-expanded={open}
        aria-controls="filtersCard"
        onClick={() => setOpen((o) => !o)}
      >
        <FilterIcon />
        Filters
      </button>
      {/* Re-mounted when the URL changes, so the fields always show the active filters. */}
      <FilterForm key={JSON.stringify(filters)} filters={filters} areas={areas} />
      <div className="cta-card">
        <h2>Can&apos;t find it?</h2>
        <p>Tell us what you&apos;re looking for and we&apos;ll search for you.</p>
        <Link className="btn btn-gold" href="/contact#message">
          Make a request
        </Link>
      </div>
    </aside>
  );
}

function FilterForm({ filters, areas }: FilterSidebarProps) {
  const { navigate } = useFilterNav();
  const [beds, setBeds] = useState(filters.beds ?? 0);
  const price = priceOptions(filters);
  // Keep a hand-typed area (e.g. from the home search) selectable even if it isn't a known area.
  const areaValue =
    areas.find((a) => a.toLowerCase() === filters.area?.toLowerCase()) ?? filters.area ?? "";
  const areaOptions = areaValue && !areas.includes(areaValue) ? [...areas, areaValue] : areas;
  const ptypeValue = TYPE_OPTIONS.some((o) => o.value === filters.ptype) ? filters.ptype : "";

  return (
    <form
      id="filtersCard"
      className={`card ${styles.form}`}
      aria-labelledby="filters-h"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const str = (k: string) => String(data.get(k) ?? "").trim() || undefined;
        const range = price.options.find((o) => o.id === data.get("price"));
        const ptype = PROPERTY_TYPES.find((t) => t === data.get("ptype"));
        const title = TITLE_DOCUMENTS.filter((t) => data.getAll("title").includes(t));
        navigate({
          // The listing type (pills) and sort (results bar) are not part of this form.
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.sort ? { sort: filters.sort } : {}),
          q: str("q"),
          area: str("area"),
          ptype,
          min: range?.min,
          max: range?.max,
          beds: beds || undefined,
          title: title.length ? title : undefined,
        });
      }}
    >
      <h2 id="filters-h">Refine your search</h2>
      <div className="ctl">
        <label htmlFor="q">Keyword</label>
        <input
          id="q"
          name="q"
          type="search"
          placeholder="e.g. duplex, Lekki"
          defaultValue={filters.q ?? ""}
        />
      </div>
      <div className="ctl">
        <label htmlFor="loc">Location</label>
        <select id="loc" name="area" defaultValue={areaValue}>
          <option value="">Any location</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="ctl">
        <label htmlFor="ptype">Property type</label>
        <select id="ptype" name="ptype" defaultValue={ptypeValue}>
          <option value="">Any type</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ctl">
        <label htmlFor="price">
          {budgetTypeFor(filters.type) === "rent" ? "Price (₦ per year)" : "Price (₦)"}
        </label>
        <select id="price" name="price" defaultValue={price.selected}>
          <option value="">Any price</option>
          {price.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="ctl">
        <legend className="lbl">Bedrooms</legend>
        <div className={`pills ${styles.beds}`}>
          {BED_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={beds === o.value}
              onClick={() => setBeds(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="ctl">
        <legend className="lbl">Title document</legend>
        <div className={styles.checks}>
          {TITLE_OPTIONS.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                name="title"
                value={o.value}
                defaultChecked={filters.title?.includes(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn-navy" type="submit">
        <SearchIcon />
        Show results
      </button>
      <button
        className={`btn ${styles.reset}`}
        type="button"
        onClick={() =>
          navigate(
            withoutKeys(filters, "q", "area", "ptype", "min", "max", "beds", "title", "page"),
          )
        }
      >
        Clear filters
      </button>
    </form>
  );
}
