"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { SEARCH_PROPERTY_TYPES, SEARCH_TABS, searchHref, type SearchTab } from "@/lib/search";
import { SearchIcon } from "../icons";
import styles from "./search-bar.module.css";

/** Search card overlapping the hero. Submits to /properties with query params. */
export function SearchBar() {
  const router = useRouter();
  const [tab, setTab] = useState<SearchTab>("buy");
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
              {/* Budget ranges are not set yet (Open question 19): placeholders, not selectable. */}
              <select id="s-bud" name="budget" defaultValue="">
                <option value="">Any budget</option>
                <option disabled>[Budget range 1]</option>
                <option disabled>[Budget range 2]</option>
                <option disabled>[Budget range 3]</option>
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
