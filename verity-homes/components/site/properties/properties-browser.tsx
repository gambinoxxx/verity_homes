import Link from "next/link";
import { getAreaGroups, getPublishedAreas, listProperties } from "@/lib/db/queries/properties";
import { parsePropertyFilters, type SearchParamsInput } from "@/lib/validation/property-filters";
import { ComingSoon } from "../coming-soon";
import { FilterNavProvider } from "./filter-nav";
import { FilterSidebar } from "./filter-sidebar";
import { ListingPills } from "./listing-pills";
import { Results } from "./results";
import styles from "./properties.module.css";

/**
 * Everything on /properties that depends on the URL. Rendered inside <Suspense> (reading
 * searchParams is request-time data under Cache Components); the queries are cached with the
 * "properties" tag, keyed by the normalised filters.
 */
export async function PropertiesBrowser({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const filters = parsePropertyFilters(await searchParams);
  const [result, areas, areaGroups] = await Promise.all([
    listProperties(filters),
    getPublishedAreas(),
    getAreaGroups(),
  ]);
  // Nothing published at all (an unfiltered search found nothing): no pills, filters or
  // "Showing 0" — just "New listings coming soon". A filtered search keeps its own empty state.
  const filtered = Object.entries(filters).some(([k, v]) => k !== "page" && v !== undefined);
  if (result.total === 0 && !filtered) return <ComingSoon path="/properties" />;
  return (
    <FilterNavProvider>
      <ListingPills filters={filters} />
      <div className={styles.layout}>
        <FilterSidebar filters={filters} areas={areas} />
        <Results filters={filters} result={result} />
      </div>
      {/* Unit 21 step 6: one page per area with published listings */}
      {areaGroups.length ? (
        <nav className={styles.areaLinks} aria-label="Browse by area">
          <h2>Browse by area</h2>
          <ul>
            {areaGroups.map((g) => (
              <li key={g.slug}>
                <Link href={`/properties/in/${g.slug}`} prefetch={false}>
                  {g.name} <span>({g.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </FilterNavProvider>
  );
}

/** Suspense fallback while the results stream in. */
export function PropertiesLoading() {
  return (
    <div className={styles.loading} role="status">
      Loading properties…
    </div>
  );
}
