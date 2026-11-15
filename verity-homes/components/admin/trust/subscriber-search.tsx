"use client";

// Search for /admin/subscribers (Unit 19b): ?q= in the URL, updated after a short pause or on
// Enter — like the properties and posts lists.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { type SubscriberFilters, subscribersHref } from "@/lib/subscribers";
import table from "../properties/properties.module.css";
import ui from "../ui.module.css";

export function SubscriberSearch({ filters }: { filters: SubscriberFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const go = (value: string) => {
    clearTimeout(timer.current);
    if (value.trim() === filters.q) return;
    startTransition(() => router.replace(subscribersHref(filters, { q: value.trim() })));
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
      <label className="sr-only" htmlFor="subscriber-search">
        Search subscribers
      </label>
      <input
        id="subscriber-search"
        className={`${ui.input} ${table.search}`}
        type="search"
        placeholder="Search by email"
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
