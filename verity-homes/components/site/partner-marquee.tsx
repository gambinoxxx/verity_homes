import Image from "next/image";
import type { PartnerView } from "@/lib/db/queries/trust";
import styles from "./partner-marquee.module.css";

function PartnerTile({ partner }: { partner: PartnerView }) {
  return partner.logoUrl ? (
    <span className={styles.logo}>
      <Image src={partner.logoUrl} alt={partner.name} width={140} height={40} />
    </span>
  ) : (
    <span>{partner.name}</span>
  );
}

type PartnerMarqueeProps = {
  /** Published + consentConfirmed partners only (getPublishedPartners). */
  partners: readonly PartnerView[];
  /** Unique id for the label (the list is named by it). */
  labelId: string;
  /** Light section (/about): muted label, grey dashed tiles. Default is the navy home style. */
  light?: boolean;
};

/**
 * "Our development partners" label + scrolling logo strip (design `.partners-label`,
 * `.marquee`). Renders nothing when there are no partners. The caller supplies the wrapper
 * (rule above, spacing) because home and /about place it differently.
 */
export function PartnerMarquee({ partners, labelId, light = false }: PartnerMarqueeProps) {
  if (partners.length === 0) return null;
  return (
    <div className={light ? styles.light : undefined} data-partners>
      <div className={styles.label} id={labelId}>
        Our development partners
      </div>
      <div className={styles.marquee}>
        <ul className={styles.track} aria-labelledby={labelId}>
          {partners.map((p) => (
            <li key={p.id}>
              <PartnerTile partner={p} />
            </li>
          ))}
          {/* Second copy for a seamless loop; hidden from screen readers. */}
          {partners.map((p) => (
            <li key={`dup-${p.id}`} aria-hidden="true">
              <PartnerTile partner={p} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
