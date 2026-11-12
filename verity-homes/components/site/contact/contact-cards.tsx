import { mapsLink } from "@/lib/maps";
import { whatsappLink } from "@/lib/whatsapp";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../icons";
import { Reveal } from "../reveal";
import styles from "./contact.module.css";

export const CONTACT_WHATSAPP_MESSAGE = "Hi Verity, I'd like to make an enquiry";

export type ContactDetails = {
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  /** officeArea, or officeAddress only when showFullAddress is on (getSiteSettings). */
  officeDisplay: string;
  mapQuery: string;
};

/** "0803 000 0000" / "+234 803…" → "+2348030000000" for tel: links. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") && digits.length === 11 ? `234${digits.slice(1)}` : digits;
  return `tel:+${intl}`;
}

/**
 * The three contact cards (design `.c-cards`). Every value comes from site settings; a missing
 * detail keeps the design's placeholder and its button is hidden (never a dead link).
 */
export function ContactCards({ details }: { details: ContactDetails }) {
  const { email, phone, whatsapp, officeDisplay, mapQuery } = details;
  const wa = whatsappLink(whatsapp, CONTACT_WHATSAPP_MESSAGE);
  return (
    <div className={styles.cards}>
      <Reveal className={styles.card}>
        <span className={styles.ic}>
          <MailIcon />
        </span>
        <h2>Email us</h2>
        <p>
          {email ? (
            <a className={styles.value} href={`mailto:${email}`}>
              {email}
            </a>
          ) : (
            <span className="ph">info@verityhomes.com.ng</span>
          )}
        </p>
        {email ? (
          <a className="btn btn-navy" href={`mailto:${email}`}>
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
              <a className="btn btn-navy" href={telHref(phone)}>
                Call us
              </a>
            ) : null}
            {wa ? (
              <a className={`btn ${styles.wa}`} href={wa} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                WhatsApp
              </a>
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
