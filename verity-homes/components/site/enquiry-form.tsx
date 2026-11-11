"use client";

import { useId } from "react";
import { ArrowIcon } from "./icons";
import styles from "./enquiry-form.module.css";

const INTERESTS = [
  { value: "INVESTING", label: "Investing" },
  { value: "BUYING", label: "Buying" },
  { value: "RENTING", label: "Renting" },
  { value: "LAND", label: "Land" },
  { value: "MANAGEMENT", label: "Management" },
] as const;

type EnquiryInterest = "BUYING" | "RENTING" | "LAND" | "INVESTING" | "MANAGEMENT";

type EnquiryFormProps = {
  /** EnquirySource for lib/validation/enquiry.ts. */
  source: "HOME_PAGE" | "PROPERTY_PAGE" | "INVEST_PAGE" | "CONTACT_PAGE";
  id?: string;
  /**
   * "full" (home/contact): name, phone, email, interest chips, message.
   * "card" (property sidebar, design `.card.enq`): name, phone, message, inspection checkbox.
   */
  variant?: "full" | "card";
  /** Heading shown at the top of the form. */
  heading?: string;
  /** Accessible name for the form; defaults to the heading. */
  label?: string;
  /** Property being enquired about (card variant). */
  propertyId?: string;
  /** Interest sent with the card variant (it has no chips). */
  interest?: EnquiryInterest;
  /** Prefilled message (card variant). */
  defaultMessage?: string;
};

/**
 * Enquiry form UI. Field names match `enquirySchema` (lib/validation/enquiry.ts).
 * NOT CONNECTED YET: Unit 7 adds the server action (useActionState), field errors, the
 * honeypot, startedAt and the success message. Until then the submit button is disabled and a
 * note says so; nothing pretends to send.
 */
export function EnquiryForm({
  source,
  id = "enquiry",
  variant = "full",
  heading = "Send an enquiry",
  label,
  propertyId,
  interest,
  defaultMessage,
}: EnquiryFormProps) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const noteId = f("live");
  const card = variant === "card";

  return (
    <form
      className={card ? styles.card : styles.form}
      id={id}
      noValidate
      {...(label ? { "aria-label": label } : { "aria-labelledby": f("h") })}
      onSubmit={(e) => e.preventDefault()}
    >
      <h3 id={f("h")}>{heading}</h3>
      <input type="hidden" name="source" value={source} />
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
      {card && interest ? <input type="hidden" name="interest" value={interest} /> : null}
      {card ? (
        <>
          <div className={styles.fg}>
            <label htmlFor={f("name")}>Full name</label>
            <input id={f("name")} name="name" autoComplete="name" required />
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("phone")}>Phone / WhatsApp</label>
            <input id={f("phone")} name="phone" type="tel" autoComplete="tel" required />
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("message")}>Message</label>
            <textarea id={f("message")} name="message" rows={3} defaultValue={defaultMessage} />
          </div>
          <label className={styles.check}>
            <input type="checkbox" name="wantsInspection" value="true" defaultChecked />
            I&apos;d like to book an inspection
          </label>
        </>
      ) : (
        <>
          <div className={styles.row}>
            <div className={styles.fg}>
              <label htmlFor={f("name")}>Full name</label>
              <input id={f("name")} name="name" autoComplete="name" required />
            </div>
            <div className={styles.fg}>
              <label htmlFor={f("phone")}>Phone / WhatsApp</label>
              <input id={f("phone")} name="phone" type="tel" autoComplete="tel" required />
            </div>
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("email")}>Email</label>
            <input id={f("email")} name="email" type="email" autoComplete="email" />
          </div>
          <fieldset className={styles.fg}>
            <legend>I&apos;m interested in</legend>
            <div className={styles.chips}>
              {INTERESTS.map((o, i) => (
                <label key={o.value}>
                  <input type="radio" name="interest" value={o.value} defaultChecked={i === 0} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.fg}>
            <label htmlFor={f("message")}>Message</label>
            <textarea
              id={f("message")}
              name="message"
              rows={4}
              placeholder="Tell us what you're looking for — location, budget, timeline"
            />
          </div>
        </>
      )}
      <button className="btn btn-navy" type="submit" disabled aria-describedby={noteId}>
        Send enquiry
        {card ? null : <ArrowIcon />}
      </button>
      <p className={styles.soon} id={noteId}>
        Form goes live soon. Until then, please reach us by WhatsApp, phone or email.
      </p>
      {card ? null : (
        <p className={styles.note}>By submitting, you agree to be contacted about your enquiry.</p>
      )}
    </form>
  );
}
