"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useTransition } from "react";
import type { PropertyFilters } from "@/lib/db/queries/properties";
import { propertiesHref } from "@/lib/validation/property-filters";
import styles from "./properties.module.css";

type FilterNav = { navigate: (filters: PropertyFilters) => void; pending: boolean };

const Ctx = createContext<FilterNav | null>(null);

/**
 * Shared by the pills, sidebar and sort: changes the URL without a full reload or a scroll
 * jump (router.push, scroll: false). The server re-renders the results from the new URL;
 * `pending` dims the old results meanwhile.
 */
export function FilterNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback(
    (filters: PropertyFilters) =>
      startTransition(() => router.push(propertiesHref(filters), { scroll: false })),
    [router],
  );
  return <Ctx.Provider value={{ navigate, pending }}>{children}</Ctx.Provider>;
}

export function useFilterNav(): FilterNav {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilterNav must be used inside <FilterNavProvider>");
  return ctx;
}

/** Results column: busy while a filter change is loading. */
export function ResultsRegion({ children }: { children: React.ReactNode }) {
  const { pending } = useFilterNav();
  return (
    <div className={styles.results} id="results" aria-busy={pending}>
      {children}
    </div>
  );
}
