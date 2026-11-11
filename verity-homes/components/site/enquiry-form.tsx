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

type EnquiryFormProps = {
  /** EnquirySource for lib/validation/enquiry.ts. */
  source: "HOME_PAGE" | "PROPERTY_PAGE" | "INVEST_PAGE" | "CONTACT_PAGE";
  id?: string;
};

/**
 * Enquiry form UI. Field names match `enquirySchema` (lib/validation/enquiry.ts).
 * NOT CONNECTED YET: Unit 7 adds the server action (useActionState), field errors, the
 * honeypot, startedAt and the success message. Until then the submit button is disabled and a
 * note says so; nothing pretends to send.
 */
export function EnquiryForm({ source, id = "enquiry" }: EnquiryFormProps) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const noteId = f("live");

  return (
    <form
      className={styles.form}
      id={id}
      noValidate
      aria-labelledby={f("h")}
      onSubmit={(e) => e.preventDefault()}
    >
      <h3 id={f("h")}>Send an enquiry</h3>
      <input type="hidden" name="source" value={source} />
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
      <button className="btn btn-navy" type="submit" disabled aria-describedby={noteId}>
        Send enquiry
        <ArrowIcon />
      </button>
      <p className={styles.soon} id={noteId}>
        Form goes live soon. Until then, please reach us by WhatsApp, phone or email.
      </p>
      <p className={styles.note}>By submitting, you agree to be contacted about your enquiry.</p>
    </form>
  );
}
