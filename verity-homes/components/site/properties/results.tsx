import Link from "next/link";
import {
  PROPERTIES_PER_PAGE,
  type PropertyFilters,
  type PropertyPage,
} from "@/lib/db/queries/properties";
import { prefetchFor } from "@/lib/nav";
import { pageNumbers, resultsLabel } from "@/lib/property-list";
import { propertiesHref } from "@/lib/validation/property-filters";
import { ArrowIcon } from "../icons";
import { PropertyCard } from "../property-card";
import { ResultsRegion } from "./filter-nav";
import { SortSelect } from "./sort-select";
import styles from "./properties.module.css";

type ResultsProps = { filters: PropertyFilters; result: PropertyPage };

/** Results bar, cards (or the empty state) and the pager, all rendered from the URL. */
export function Results({ filters, result }: ResultsProps) {
  const { items, total, page, pageCount } = result;
  return (
    <div>
      <div className={styles.bar}>
        <b aria-live="polite">{resultsLabel(total, page, PROPERTIES_PER_PAGE)}</b>
        <SortSelect filters={filters} />
      </div>
      <ResultsRegion>
        {items.length ? (
          <div className={styles.grid}>
            {items.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                cta="details"
                reveal={i % 2 ? 1 : 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1020px) 50vw, 440px"
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>No properties match your search</h2>
            <p>Try fewer filters, or tell us what you need and we&apos;ll look for you.</p>
            <div>
              <Link className="btn btn-outline-dark" href="/properties" scroll={false}>
                Clear filters
              </Link>
              <Link className="btn btn-gold" href="/contact" prefetch={prefetchFor("/contact")}>
                Make a request
              </Link>
            </div>
          </div>
        )}
        {pageCount > 1 ? <Pager filters={filters} page={page} pageCount={pageCount} /> : null}
      </ResultsRegion>
    </div>
  );
}

function Pager({
  filters,
  page,
  pageCount,
}: {
  filters: PropertyFilters;
  page: number;
  pageCount: number;
}) {
  const href = (n: number) => propertiesHref({ ...filters, page: n }, "#results");
  return (
    <nav className={styles.pager} aria-label="Pagination">
      {page > 1 ? (
        <Link className={styles.prev} href={href(page - 1)} aria-label="Previous page">
          <ArrowIcon />
        </Link>
      ) : null}
      {pageNumbers(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label="Next page">
          <ArrowIcon />
        </Link>
      ) : null}
    </nav>
  );
}
