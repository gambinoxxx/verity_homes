import { mapEmbedUrl, mapsLink } from "@/lib/maps";
import { PinIcon } from "../icons";
import { Reveal } from "../reveal";
import styles from "./contact.module.css";

type OfficeMapProps = {
  companyName: string;
  /** Shown on the card: the area, or the full address only when showFullAddress is on. */
  officeDisplay: string;
  /** SiteSettings.mapQuery, e.g. "Onipanu, Lagos". */
  mapQuery: string;
};

/** Grayscale Google Maps embed (keyless output=embed) with the design's map card. */
export function OfficeMap({ companyName, officeDisplay, mapQuery }: OfficeMapProps) {
  return (
    <Reveal className={styles.map}>
      <iframe
        title={`Map showing our office area in ${mapQuery}`}
        src={mapEmbedUrl(mapQuery, 14)}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className={styles.mapCard}>
        <b>{companyName.replace(/\s+Ltd\.?$/i, "")}</b>
        <span>{officeDisplay}</span>
        <a
          className="btn btn-navy"
          href={mapsLink(mapQuery)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <PinIcon />
          Open in Maps
        </a>
      </div>
    </Reveal>
  );
}
