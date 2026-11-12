import { getSiteSettings } from "@/lib/db/queries/settings";
import { whatsappLink } from "@/lib/whatsapp";
import { EnquiryForm } from "../enquiry-form";
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from "../icons";
import { PillTicker } from "../pill-ticker";
import { Reveal } from "../reveal";
import styles from "./contact-block.module.css";

const WHATSAPP_MESSAGE = "Hello Verity Homes and Properties, I would like to make an enquiry.";

/**
 * "Ready to buy, rent or invest?": contact details from site settings (placeholders while
 * unset, Open questions 1–2) and the enquiry form. Without a WhatsApp number the button points
 * at the form beside it.
 */
export async function ContactBlock() {
  const settings = await getSiteSettings();
  const wa = whatsappLink(settings.whatsapp, WHATSAPP_MESSAGE);
  const { phone, email } = settings;

  return (
    <section className="sec" id="contact" aria-labelledby="c-h">
      <div className="container">
        <Reveal className={`${styles.box} on-navy`}>
          <div className={styles.text}>
            <PillTicker label="Quick enquiry" />
            <h2 className="h2" id="c-h">
              Ready to buy, rent <em>or invest?</em>
            </h2>
            <p className={`lead ${styles.lead}`}>
              Send a message or chat with us directly on WhatsApp. We&apos;ll get back to you as
              soon as we can.
            </p>
            <a
              className={`btn btn-gold ${styles.wa}`}
              href={wa ?? "#enquiry"}
              {...(wa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <WhatsAppIcon />
              Chat on WhatsApp
            </a>
            <ul className={styles.list}>
              <li>
                <span className={styles.ci}>
                  <PhoneIcon />
                </span>
                <span>
                  <small>Phone / WhatsApp</small>
                  {phone ? (
                    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
                  ) : (
                    <span className="ph">Phone number</span>
                  )}
                </span>
              </li>
              <li>
                <span className={styles.ci}>
                  <MailIcon />
                </span>
                <span>
                  <small>Email</small>
                  {email ? (
                    <a href={`mailto:${email}`}>{email}</a>
                  ) : (
                    <span className="ph">Email address</span>
                  )}
                </span>
              </li>
              <li>
                <span className={styles.ci}>
                  <PinIcon />
                </span>
                <span>
                  <small>Office</small>
                  {settings.officeDisplay}
                </span>
              </li>
            </ul>
          </div>
          <EnquiryForm source="HOME_PAGE" />
        </Reveal>
      </div>
    </section>
  );
}
