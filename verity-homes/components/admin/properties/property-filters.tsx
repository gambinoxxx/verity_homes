"use client";

// Search (title or area) and listing-type filter for /admin/properties. Both live in the URL:
// typing updates ?q= after a short pause (or on Enter), the select updates ?type= at once.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ADMIN_TYPE_PARAM,
  type AdminPropertyFilters,
  type AdminTypeParam,
  adminPropertiesHref,
} from "@/lib/validation/admin-property-filters";
import ui from "../ui.module.css";
import styles from "./properties.module.css";

const TYPE_LABEL: Record<AdminTypeParam, string> = {
  sale: "For sale",
  rent: "For rent",
  land: "Land",
  "off-plan": "Off-plan",
};

export function PropertySearch({ filters }: { filters: AdminPropertyFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (value: string) => {
    clearTimeout(timer.current);
    if (value.trim() === filters.q) return;
    startTransition(() => router.replace(adminPropertiesHref(filters, { q: value.trim() })));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      style={{ display: "contents" }}
    >
      <label className="sr-only" htmlFor="property-search">
        Search properties
      </label>
      <input
        id="property-search"
        className={`${ui.input} ${styles.search}`}
        type="search"
        placeholder="Search by title or location"
        value={q}
        onChange={(e) => {
          const value = e.target.value;
          setQ(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go(value), 400);
        }}
      />
    </form>
  );
}

export function PropertyTypeFilter({ filters }: { filters: AdminPropertyFilters }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <>
      <label className="sr-only" htmlFor="property-type">
        Listing type
      </label>
      <select
        id="property-type"
        className={ui.select}
        value={filters.type ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const type = v in ADMIN_TYPE_PARAM ? (v as AdminTypeParam) : null;
          startTransition(() => router.replace(adminPropertiesHref(filters, { type })));
        }}
      >
        <option value="">All types</option>
        {(Object.keys(TYPE_LABEL) as AdminTypeParam[]).map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </select>
    </>
  );
}
