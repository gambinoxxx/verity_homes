// Server-rendered sections of the property page (design/property.html), top to bottom.
// Each block renders only when the listing has data for it (no invented values).
import Image from "next/image";
import Link from "next/link";
import type { PropertyCard as PropertyCardData, PropertyDetail } from "@/lib/db/queries/properties";
import { LISTING_LABEL } from "@/lib/format";
import { mapEmbedUrl, mapsLink, propertyMapQuery } from "@/lib/maps";
import { prefetchFor } from "@/lib/nav";
import {
  descriptionParagraphs,
  enquiryInterest,
  propertyFacts,
  type FactKey,
} from "@/lib/property-detail";
import { EnquiryForm } from "../enquiry-form";
import {
  AreaIcon,
  ArrowIcon,
  BathIcon,
  BedIcon,
  CarIcon,
  CheckIcon,
  DocIcon,
  PinIcon,
  WhatsAppIcon,
} from "../icons";
import { PillTicker } from "../pill-ticker";
import { PropertyCard } from "../property-card";
import { SaveButton } from "../save-button";
import { ShareButton } from "./share-button";
import styles from "./property.module.css";
import { Reveal } from "../reveal";

type P = { property: PropertyDetail };

/** Short page hero: cover photo behind a dark overlay, with the breadcrumb. */
export function PropertyHero({ property: p }: P) {
  const cover = p.images[0];
  return (
    <section className={styles.hero}>
      <div className="media">
        {cover ? <Image src={cover.url} alt="" fill priority sizes="100vw" /> : null}
      </div>
      <div className="container">
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/properties" prefetch={prefetchFor("/properties")}>
                Properties
              </Link>
            </li>
            <li>
              <span aria-current="page">{p.title}</span>
            </li>
          </ol>
        </nav>
      </div>
    </section>
  );
}

/** "₦6,500,000 / year" → amount with the period in small type. */
function Price({ label }: { label: string }) {
  const [amount, period] = label.split(" / ");
  return (
    <b>
      {amount}
      {period ? <small> / {period}</small> : null}
    </b>
  );
}

export function PropertyHead({ property: p, url }: P & { url: string }) {
  const gold = p.listingType === "SALE" || p.listingType === "OFF_PLAN";
  return (
    <div className={styles.head}>
      <div>
        <span className={`${styles.tag} ${gold ? styles.tagGold : ""}`}>
          {LISTING_LABEL[p.listingType]}
        </span>
        <h1>{p.title}</h1>
        <p className={styles.loc}>
          <PinIcon />
          {p.area}, {p.city}
        </p>
      </div>
      <div className={styles.price}>
        <small>{p.listingType === "RENT" ? "Rent" : "Asking price"}</small>
        <Price label={p.priceLabel} />
        <div className={styles.actions}>
          <SaveButton slug={p.slug} title={p.title} className={styles.iconBtn} />
          <ShareButton
            title={p.title}
            url={url}
            className={styles.iconBtn}
            noteClassName={styles.copied}
          />
        </div>
      </div>
    </div>
  );
}

const FACT_ICON: Record<FactKey, React.ComponentType> = {
  beds: BedIcon,
  baths: BathIcon,
  size: AreaIcon,
  parking: CarIcon,
  title: DocIcon,
  completion: DocIcon,
};

export function FactsStrip({ property }: P) {
  const facts = propertyFacts(property);
  if (facts.length === 0) return <div className={styles.noFacts} />;
  return (
    <dl
      className={styles.facts}
      style={{ "--cols": Math.min(facts.length, 5) } as React.CSSProperties}
    >
      {facts.map((f) => {
        const Icon = FACT_ICON[f.key];
        return (
          <div key={f.key}>
            <dt>{f.label}</dt>
            <dd>
              <Icon />
              {f.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function AboutBlock({ property: p }: P) {
  const paragraphs = descriptionParagraphs(p.description);
  if (paragraphs.length === 0) return null;
  const heading = p.listingType === "LAND" ? "About this land" : "About this home";
  return (
    <Reveal className={styles.block}>
      <h2>{heading}</h2>
      <div className={styles.prose}>
        {paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
    </Reveal>
  );
}

export function FeaturesBlock({ property: p }: P) {
  const features = p.features.map((f) => f.trim()).filter(Boolean);
  if (features.length === 0) return null;
  return (
    <Reveal className={styles.block}>
      <h2>Features &amp; amenities</h2>
      <ul className={styles.features}>
        {features.map((f, i) => (
          <li key={`${f}-${i}`}>
            <CheckIcon />
            {f}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

export function DocumentsBlock({ property: p }: P) {
  if (p.documents.length === 0) return null;
  return (
    <Reveal className={styles.block}>
      <h2>Documents</h2>
      <ul className={styles.docs}>
        {p.documents.map((d) => (
          <li key={d.id}>
            {d.name}
            {d.verified ? <span className={styles.verified}>Verified</span> : null}
          </li>
        ))}
      </ul>
      <p className={styles.note}>Copies are shared on request, before any payment.</p>
    </Reveal>
  );
}

/**
 * Map from lib/maps.ts: the exact pin only when the admin allows it, otherwise "area, city".
 * The private address is never selected by the query layer, so it cannot appear here.
 */
export function LocationBlock({ property: p }: P) {
  const { query, zoom, exact } = propertyMapQuery(p);
  return (
    <Reveal className={styles.block} id="location">
      <h2>Location</h2>
      <div className={styles.map}>
        <iframe
          title="Map showing the property's location"
          src={mapEmbedUrl(query, zoom)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className={styles.mapCard}>
          <b>{p.title}</b>
          <span>
            {p.area}, {p.city}
            {exact ? null : <> — Exact address shared at inspection.</>}
          </span>
          <a
            className="btn btn-navy"
            href={mapsLink(query)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <PinIcon />
            Open in Google Maps
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
      {p.nearby.length > 0 ? (
        <ul className={styles.nearby} aria-label="Nearby places">
          {p.nearby.map((n, i) => (
            <li key={`${n.place}-${i}`}>
              <span>{n.place}</span>
              <b>{n.minutes} min</b>
            </li>
          ))}
        </ul>
      ) : null}
    </Reveal>
  );
}

/** WhatsApp link props: wa.me in a new tab, or the on-page form when no number is set. */
const waProps = (href: string) =>
  href.startsWith("https://") ? { href, target: "_blank", rel: "noopener noreferrer" } : { href };

export function EnquiryCard({ property: p, whatsappHref }: P & { whatsappHref: string }) {
  return (
    <aside className={styles.side} id="enquire" aria-label="Enquire">
      <div className={styles.card}>
        <div className={styles.agent}>
          <Image src="/samples/ceo.jpg" alt="" width={56} height={56} sizes="56px" />
          <span>
            <b>Esther Ezenagu</b>
            <small>Founder &amp; CEO</small>
          </span>
        </div>
        <EnquiryForm
          source="PROPERTY_PAGE"
          id="enquiry"
          variant="card"
          heading={
            p.listingType === "LAND" ? "Interested in this land?" : "Interested in this home?"
          }
          label="Enquire about this property"
          propertyId={p.id}
          interest={enquiryInterest(p.listingType)}
          defaultMessage={`I'm interested in the ${p.title}. Please contact me.`}
        />
        <div className={styles.or}>or</div>
        <a className={`btn ${styles.wa}`} {...waProps(whatsappHref)}>
          <WhatsAppIcon />
          Chat on WhatsApp
        </a>
      </div>
    </aside>
  );
}

/** Fixed bottom bar on phones and tablets (design `.m-bar`). */
export function MobileBar({ whatsappHref }: { whatsappHref: string }) {
  return (
    <div className={styles.mbar} data-mbar>
      <a className="btn btn-navy" href="#enquire">
        Enquire
      </a>
      <a className={`btn ${styles.wa}`} {...waProps(whatsappHref)}>
        <WhatsAppIcon />
        WhatsApp
      </a>
    </div>
  );
}

export function SimilarProperties({ items }: { items: PropertyCardData[] }) {
  if (items.length === 0) return null;
  return (
    <section className={`sec ${styles.similar}`} aria-labelledby="sim-h">
      <div className="container">
        <div className="sec-head">
          <div>
            <PillTicker label="Similar properties" />
            <h2 className="h2" id="sim-h">
              You may also like
            </h2>
          </div>
          <Link className="link-arrow" href="/properties" prefetch={prefetchFor("/properties")}>
            All properties
            <ArrowIcon />
          </Link>
        </div>
        <div className={styles.grid}>
          {items.map((item) => (
            <PropertyCard key={item.id} property={item} reveal={0} />
          ))}
        </div>
      </div>
    </section>
  );
}
