import { getShowcaseProperties, type PropertyCard } from "@/lib/db/queries/properties";
import { PROJECT_STATUS_LABEL, TITLE_LABEL } from "@/lib/format";
import { PillTicker } from "../pill-ticker";
import { ShowcaseStack, type ShowcaseItem } from "./showcase-stack";
import styles from "./showcase.module.css";

/** One line of facts that exist on the listing, e.g. "4 bedrooms · 450 sqm · C of O". */
function factsLine(p: PropertyCard): string {
  return [
    p.bedrooms ? `${p.bedrooms} bedroom${p.bedrooms === 1 ? "" : "s"}` : null,
    p.sizeSqm ? `${p.sizeSqm.toLocaleString("en-NG")} sqm` : null,
    p.titleDocument ? TITLE_LABEL[p.titleDocument] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * "Signature projects": sticky panel + stacking photo cards, from properties flagged
 * `showcase`. The section is left out entirely when there are none.
 */
export async function Showcase() {
  const properties = await getShowcaseProperties();
  if (properties.length === 0) return null;

  const items: ShowcaseItem[] = properties.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    location: `${p.area}, ${p.city}`,
    status: p.projectStatus ? PROJECT_STATUS_LABEL[p.projectStatus] : null,
    facts: factsLine(p),
    cover: p.cover,
  }));

  return (
    <section className={`${styles.showcase} on-navy`} aria-labelledby="sc-h">
      <div className="container">
        <div className={`sec-head ${styles.head}`}>
          <div>
            <PillTicker label="Signature projects" />
            <h2 className="h2" id="sc-h">
              Developments we&apos;re <em>proud of.</em>
            </h2>
          </div>
          <p className="lead">
            Estates and buildings delivered with our partners — from first foundation to final
            handover.
          </p>
        </div>
        <ShowcaseStack items={items} />
      </div>
    </section>
  );
}
