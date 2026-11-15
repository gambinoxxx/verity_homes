import { WhatsAppIcon } from "./icons";
import { PlotAwareWhatsApp } from "./property/whatsapp-link";
import styles from "./help-cta.module.css";

type ActionsProps = {
  /** Site WhatsApp number (settings); without one the button goes to `callBackHref`. */
  whatsapp: string | null;
  /** Pre-filled WhatsApp message. */
  whatsappText: string;
  /** The plan/post the buttons belong to (a plan page's WhatsApp text follows "Select"). */
  ownerId: string;
  /** Where "Request a call back" goes: the page's enquiry form. */
  callBackHref: string;
};

/** Two equal buttons — WhatsApp (green) and "Request a call back" (outline navy). */
export function HelpCtaActions({ whatsapp, whatsappText, ownerId, callBackHref }: ActionsProps) {
  return (
    <div className={styles.ctaActions}>
      <PlotAwareWhatsApp
        className={`btn ${styles.wa}`}
        number={whatsapp}
        defaultText={whatsappText}
        ownerId={ownerId}
        fallbackHref={callBackHref}
      >
        <WhatsAppIcon />
        Chat on WhatsApp
      </PlotAwareWhatsApp>
      <a className={`btn ${styles.callBack}`} href={callBackHref}>
        Request a call back
      </a>
    </div>
  );
}

/**
 * Cream "Not sure? Talk to us" card with the two buttons (48px above and below). Plan pages
 * ("Not sure which package suits you?") and the end of blog posts.
 */
export function HelpCta({
  title,
  text,
  ...actions
}: ActionsProps & { title: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className={styles.cta} data-testid="help-cta">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <HelpCtaActions {...actions} />
    </div>
  );
}
