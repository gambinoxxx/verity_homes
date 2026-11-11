import Link from "next/link";
import { getFeaturedProperties } from "@/lib/db/queries/properties";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import { FeaturedGrid } from "./featured-grid";
import styles from "./featured.module.css";

/** "Featured properties": up to 6 published, featured listings with on-page filters. */
export async function Featured() {
  const properties = await getFeaturedProperties();
  return (
    <section className={`sec ${styles.props}`} id="properties" aria-labelledby="props-h">
      <div className="container">
        <FeaturedGrid properties={properties}>
          <div>
            <span className="eyebrow reveal">Featured properties</span>
            <h2 className="h2 reveal d1" id="props-h">
              Homes and land worth owning
            </h2>
          </div>
        </FeaturedGrid>
        <div className={`${styles.more} reveal`}>
          <Link
            className="btn btn-outline-dark"
            href="/properties"
            prefetch={prefetchFor("/properties")}
          >
            View all properties
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
