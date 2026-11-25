import { mapsLink } from "@/lib/maps";
import { telHref } from "@/lib/contact-links";
import { PageWhatsAppLink } from "../page-whatsapp-link";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../icons";
import { Reveal } from "../reveal";
import styles from "./contact.module.css";

export type ContactDetails = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  /** officeArea, or officeAddress only when showFullAddress is on (getSiteSettings). */
  officeDisplay: string;
  mapQuery: string;
};

export { telHref };

/**
 * The three contact cards (design `.c-cards`). Every value comes from site settings; a missing
 * detail keeps the design's placeholder and its button is hidden (never a dead link).
 */
export function ContactCards({ details }: { details: ContactDetails }) {
  const { email, phone, whatsapp, officeDisplay, mapQuery } = details;
  const wa = Boolean(whatsapp?.replace(/\D/g, ""));
  return (
    <div className={styles.cards}>
      <Reveal className={styles.card}>
        <span className={styles.ic}>
          <MailIcon />
        </span>
        <h2>Email us</h2>
        <p>
          {email ? (
            <a className={styles.value} href={`mailto:${email}`} data-contact="email">
              {email}
            </a>
          ) : (
            <span className="ph">info@verityhomes.ng</span>
          )}
        </p>
        {email ? (
          <a className="btn btn-navy" href={`mailto:${email}`} data-contact="email">
            Send an email
          </a>
        ) : null}
      </Reveal>

      <Reveal className={styles.card} delay={1}>
        <span className={styles.ic}>
          <PhoneIcon />
        </span>
        <h2>Call or WhatsApp</h2>
        <p>{phone ? phone : <span className="ph">Phone number</span>}</p>
        {phone || wa ? (
          <div className={styles.actions}>
            {phone ? (
              <a className="btn btn-navy" href={telHref(phone)} data-contact="phone">
                Call us
              </a>
            ) : null}
            {wa ? (
              <PageWhatsAppLink number={whatsapp} className={`btn ${styles.wa}`}>
                <WhatsAppIcon />
                WhatsApp
              </PageWhatsAppLink>
            ) : null}
          </div>
        ) : null}
      </Reveal>

      <Reveal className={styles.card} delay={2}>
        <span className={styles.ic}>
          <PinIcon />
        </span>
        <h2>Visit us</h2>
        <p>{officeDisplay}</p>
        <a
          className="btn btn-navy"
          href={mapsLink(mapQuery)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get directions
        </a>
      </Reveal>
    </div>
  );
}
