"use client";

// Search (name, phone, email, message) and interest filter for /admin/enquiries, in the URL:
// typing updates ?q= after a short pause (or on Enter); the select updates ?interest= at once.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { INTEREST_LABEL } from "@/lib/format";
import {
  type EnquiryFilters,
  INTEREST_PARAM,
  type InterestParam,
  enquiriesHref,
} from "@/lib/validation/admin-enquiry-filters";
import propStyles from "../properties/properties.module.css";
import ui from "../ui.module.css";

export function EnquirySearch({ filters }: { filters: EnquiryFilters }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (value: string) => {
    clearTimeout(timer.current);
    if (value.trim() === filters.q) return;
    startTransition(() => router.replace(enquiriesHref(filters, { q: value.trim() })));
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <form
      role="search"
      style={{ display: "contents" }}
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <label className="sr-only" htmlFor="enquiry-search">
        Search enquiries
      </label>
      <input
        id="enquiry-search"
        className={`${ui.input} ${propStyles.search}`}
        type="search"
        placeholder="Search name, phone, email or message"
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

export function InterestFilter({ filters }: { filters: EnquiryFilters }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <>
      <label className="sr-only" htmlFor="enquiry-interest">
        Interested in
      </label>
      <select
        id="enquiry-interest"
        className={ui.select}
        value={filters.interest ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const interest = v in INTEREST_PARAM ? (v as InterestParam) : null;
          startTransition(() => router.replace(enquiriesHref(filters, { interest })));
        }}
      >
        <option value="">All interests</option>
        {(Object.keys(INTEREST_PARAM) as InterestParam[]).map((k) => (
          <option key={k} value={k}>
            {INTEREST_LABEL[INTEREST_PARAM[k]]}
          </option>
        ))}
      </select>
    </>
  );
}
