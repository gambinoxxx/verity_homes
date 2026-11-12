import { getPublishedAreas, listProperties } from "@/lib/db/queries/properties";
import { parsePropertyFilters, type SearchParamsInput } from "@/lib/validation/property-filters";
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
  const [result, areas] = await Promise.all([listProperties(filters), getPublishedAreas()]);
  return (
    <FilterNavProvider>
      <ListingPills filters={filters} />
      <div className={styles.layout}>
        <FilterSidebar filters={filters} areas={areas} />
        <Results filters={filters} result={result} />
      </div>
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
