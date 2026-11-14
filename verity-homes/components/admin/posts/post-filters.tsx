"use client";

// Search (title or excerpt) and category filter for /admin/posts (Unit 18), like the properties
// list: typing updates ?q= after a short pause (or on Enter), the select updates ?category=.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type AdminPostFilters, adminPostsHref } from "@/lib/validation/admin-post-filters";
// ui first, then the list styles, so `.search` (icon + padding) wins over `.input` — the same
// order as property-filters.tsx.
import ui from "../ui.module.css";
import styles from "../properties/properties.module.css";

export function PostSearch({ filters }: { filters: AdminPostFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (value: string) => {
    clearTimeout(timer.current);
    if (value.trim() === filters.q) return;
    startTransition(() => router.replace(adminPostsHref(filters, { q: value.trim() })));
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
      <label className="sr-only" htmlFor="post-search">
        Search posts
      </label>
      <input
        id="post-search"
        className={`${ui.input} ${styles.search}`}
        type="search"
        placeholder="Search by title or excerpt"
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

export function PostCategoryFilter({
  filters,
  categories,
}: {
  filters: AdminPostFilters;
  categories: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <>
      <label className="sr-only" htmlFor="post-category">
        Category
      </label>
      <select
        id="post-category"
        className={ui.select}
        value={filters.category ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const category = categories.some((c) => c.slug === v) ? v : null;
          startTransition(() => router.replace(adminPostsHref(filters, { category })));
        }}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
    </>
  );
}
