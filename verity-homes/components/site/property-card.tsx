import Image from "next/image";
import Link from "next/link";
import type { PropertyCard as PropertyCardData } from "@/lib/db/queries/properties";
import { LISTING_LABEL, PROJECT_STATUS_LABEL, TITLE_LABEL } from "@/lib/format";
import { prefetchFor } from "@/lib/nav";
import { AreaIcon, BathIcon, BedIcon, DocIcon, PinIcon } from "./icons";
import { Reveal } from "./reveal";
import { SaveButton } from "./save-button";
import styles from "./property-card.module.css";

type PropertyCardProps = {
  property: PropertyCardData;
  /** `sizes` for the cover photo; the default fits the 3/2/1-column grid. */
  sizes?: string;
  className?: string;
  /** Reveal on scroll, with this stagger (0–3). Leave out for no reveal. */
  reveal?: 0 | 1 | 2 | 3;
  /**
   * Footer button: "enquire" (home, similar listings) links to the enquiry card on the
   * property page; "details" (the /properties list, as in design/properties.html) to the page.
   */
  cta?: "enquire" | "details";
};

const GOLD_TAGS = new Set(["SALE", "OFF_PLAN"]);

/** A missing number shows the design's dashed placeholder, not an invented value. */
function Value({ n }: { n: number | null }) {
  return n == null ? <span className="ph">—</span> : <>{n.toLocaleString("en-NG")}</>;
}

/** "₦6,500,000 / year" → price with the period in small type (the design's `.price small`). */
function Price({ label }: { label: string }) {
  const [amount, period] = label.split(" / ");
  return (
    <span className={styles.price}>
      {amount}
      {period ? <small> / {period}</small> : null}
    </span>
  );
}

/** Property card (design `.prop`). Server-safe; only the heart button is a client component. */
export function PropertyCard({
  property: p,
  sizes = "(max-width: 640px) 100vw, (max-width: 1020px) 50vw, 410px",
  className,
  reveal,
  cta = "enquire",
}: PropertyCardProps) {
  const href = `/properties/${p.slug}`;
  const prefetch = prefetchFor(href);
  const isLand = p.listingType === "LAND";
  const isOffPlan = p.listingType === "OFF_PLAN";

  return (
    <CardRoot className={`${styles.card} ${className ?? ""}`} reveal={reveal}>
      <div className={`${styles.image} media`}>
        <span
          className={`${styles.tag} ${GOLD_TAGS.has(p.listingType) ? styles.gold : ""}`}
          data-tag={p.listingType.toLowerCase()}
        >
          {LISTING_LABEL[p.listingType]}
        </span>
        <SaveButton slug={p.slug} title={p.title} className={styles.fav} />
        {p.cover ? <Image src={p.cover.url} alt={p.cover.alt} fill sizes={sizes} /> : null}
      </div>
      <div className={styles.body}>
        <h3>
          <Link href={href} prefetch={prefetch}>
            {p.title}
          </Link>
        </h3>
        <div className={styles.loc}>
          <PinIcon />
          <span>
            {p.area}, {p.city}
          </span>
        </div>
        <div className={styles.specs}>
          {isLand ? (
            <>
              <span>
                <AreaIcon />
                {p.sizeLabel ?? (
                  <>
                    <Value n={p.sizeSqm} /> sqm
                  </>
                )}
              </span>
              <span>
                <DocIcon />
                {p.titleDocument ? (
                  TITLE_LABEL[p.titleDocument]
                ) : (
                  <span className="ph">Title document</span>
                )}
              </span>
            </>
          ) : isOffPlan ? (
            // Design: unit types + completion. "Off-plan" itself is already the tag.
            <>
              <span>
                <DocIcon />
                {p.bedrooms != null ? `${p.bedrooms} Beds` : <span className="ph">Unit types</span>}
              </span>
              <span>
                {p.projectStatus && p.projectStatus !== "OFF_PLAN" ? (
                  PROJECT_STATUS_LABEL[p.projectStatus]
                ) : (
                  <span className="ph">Completion date</span>
                )}
              </span>
            </>
          ) : (
            <>
              <span>
                <BedIcon />
                <Value n={p.bedrooms} /> Beds
              </span>
              <span>
                <BathIcon />
                <Value n={p.bathrooms} /> Baths
              </span>
              <span>
                <AreaIcon />
                {p.sizeLabel ?? (
                  <>
                    <Value n={p.sizeSqm} /> sqm
                  </>
                )}
              </span>
            </>
          )}
        </div>
        <div className={styles.foot}>
          <Price label={p.priceLabel} />
          {cta === "details" ? (
            <Link className="btn btn-navy" href={href} prefetch={prefetch}>
              View details
              <span className="sr-only"> of {p.title}</span>
            </Link>
          ) : (
            <Link className="btn btn-navy" href={`${href}#enquire`} prefetch={prefetch}>
              {isOffPlan ? "Register interest" : "Enquire"}
              <span className="sr-only"> about {p.title}</span>
            </Link>
          )}
        </div>
      </div>
    </CardRoot>
  );
}

/** <article>, or a revealing <article> (state owned by <Reveal>, so it survives re-renders). */
function CardRoot({
  className,
  reveal,
  children,
}: {
  className: string;
  reveal?: 0 | 1 | 2 | 3;
  children: React.ReactNode;
}) {
  if (reveal === undefined) return <article className={className}>{children}</article>;
  return (
    <Reveal as="article" className={className} delay={reveal}>
      {children}
    </Reveal>
  );
}
