import Link from "next/link";
import { getFeaturedProperties } from "@/lib/db/queries/properties";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import { Reveal } from "../reveal";
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
            <Reveal as="span" className="eyebrow">
              Featured properties
            </Reveal>
            <Reveal as="h2" className="h2" delay={1} id="props-h">
              Homes and land worth owning
            </Reveal>
          </div>
        </FeaturedGrid>
        <Reveal className={styles.more}>
          <Link
            className="btn btn-outline-dark"
            href="/properties"
            prefetch={prefetchFor("/properties")}
          >
            View all properties
            <ArrowIcon />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
