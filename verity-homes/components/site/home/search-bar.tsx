"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import {
  SEARCH_PROPERTY_TYPES,
  SEARCH_TABS,
  TYPE_PARAM,
  searchHref,
  type SearchTab,
} from "@/lib/search";
import { BUDGET_RANGES } from "@/lib/search-ranges";
import { SearchIcon } from "../icons";
import styles from "./search-bar.module.css";

/** Search card overlapping the hero. Submits to /properties with query params. */
export function SearchBar() {
  const router = useRouter();
  const [tab, setTabState] = useState<SearchTab>("buy");
  const [budget, setBudget] = useState("");
  const ranges = tab === "invest" ? [] : BUDGET_RANGES[TYPE_PARAM[tab]];
  // Each tab has its own ranges, so a chosen budget never carries over to another tab.
  const setTab = (next: SearchTab) => {
    setTabState(next);
    setBudget("");
  };
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern); only the selected tab is in the Tab order.
  const onTabKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + SEARCH_TABS.length) % SEARCH_TABS.length;
    const nextTab = SEARCH_TABS[next];
    if (!nextTab) return;
    setTab(nextTab.id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.wrap} id="search">
      <div className="container">
        <form
          className={`${styles.search} reveal`}
          aria-label="Find a property"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            router.push(
              searchHref(tab, {
                area: String(data.get("area") ?? ""),
                ptype: String(data.get("ptype") ?? ""),
                budget,
              }),
            );
          }}
        >
          <div className={styles.tabs} role="tablist" aria-label="What are you looking for?">
            {SEARCH_TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="s-loc">Location</label>
              <input id="s-loc" name="area" type="text" placeholder="e.g. Lekki, Ajah, Ikeja" />
            </div>
            <div className={styles.field}>
              <label htmlFor="s-type">Property type</label>
              <select id="s-type" name="ptype" defaultValue="">
                <option value="">Any type</option>
                {SEARCH_PROPERTY_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="s-bud">Budget</label>
              {/* Ranges follow the tab (lib/search-ranges.ts). The Invest tab has none. */}
              <select
                id="s-bud"
                name="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                disabled={ranges.length === 0}
              >
                <option value="">Any budget</option>
                {ranges.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-navy" type="submit">
              <SearchIcon />
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
