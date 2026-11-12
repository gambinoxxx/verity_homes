"use client";

import { useActionState, useEffect, useId, useRef, startTransition } from "react";
import { createEnquiry, type EnquiryField, type EnquiryState } from "@/lib/actions/enquiry";
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

/** Field order on screen: the first one with an error gets focus. */
const FIELD_ORDER: EnquiryField[] = ["name", "phone", "email", "amount", "message"];

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
  /** Property being enquired about (property page). */
  propertyId?: string;
  /** Investment plan being enquired about (invest page, Unit 9). */
  planId?: string;
  /** Fixed interest (sent as a hidden field instead of the chips). */
  interest?: EnquiryInterest;
  /** Prefilled message. */
  defaultMessage?: string;
};

/**
 * Enquiry form, connected to the createEnquiry server action (lib/actions/enquiry.ts).
 * Errors sit under their fields (aria-describedby) and focus moves to the first invalid one;
 * the success message is announced from a role="status" region; the button is disabled while
 * sending, so it can't be double-submitted. Hidden fields: a `company` honeypot and the time
 * the form was first shown (`startedAt`, minimum fill time).
 */
export function EnquiryForm({
  source,
  id = "enquiry",
  variant = "full",
  heading = "Send an enquiry",
  label,
  propertyId,
  planId,
  interest,
  defaultMessage,
}: EnquiryFormProps) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const card = variant === "card";
  const formRef = useRef<HTMLFormElement>(null);
  const startedAt = useRef(0);
  const submitting = useRef(false);
  const [state, formAction, pending] = useActionState<EnquiryState, FormData>(createEnquiry, null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // After each response: focus the first invalid field, or reset the form after success.
  useEffect(() => {
    submitting.current = false;
    const form = formRef.current;
    if (!state || !form) return;
    if (state.ok) {
      form.reset();
      startedAt.current = Date.now();
      return;
    }
    const first = FIELD_ORDER.find((k) => state.fieldErrors?.[k]);
    const el = first ? form.elements.namedItem(first) : null;
    if (el instanceof HTMLElement) el.focus();
  }, [state]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const formError = state && !state.ok ? state.error : undefined;

  /** Props linking a field to its error message. */
  const field = (name: EnquiryField) => {
    const error = errors[name];
    return {
      id: f(name),
      name,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? f(`${name}-err`) : undefined,
    };
  };
  const errorText = (name: EnquiryField) =>
    errors[name] ? (
      <p className={styles.fieldError} id={f(`${name}-err`)}>
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      ref={formRef}
      className={card ? styles.card : styles.form}
      id={id}
      noValidate
      {...(label ? { "aria-label": label } : { "aria-labelledby": f("h") })}
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting.current || pending) return; // no double submit
        submitting.current = true;
        const data = new FormData(e.currentTarget);
        data.set("startedAt", String(startedAt.current));
        startTransition(() => formAction(data));
      }}
    >
      <h3 id={f("h")}>{heading}</h3>
      <input type="hidden" name="source" value={source} />
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
      {planId ? <input type="hidden" name="planId" value={planId} /> : null}
      {interest ? <input type="hidden" name="interest" value={interest} /> : null}
      {/* Honeypot: invisible to people, tempting to bots. Must stay empty. */}
      <div className={styles.hp} aria-hidden="true">
        <label htmlFor={f("company")}>Company</label>
        <input id={f("company")} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {card ? (
        <>
          <div className={styles.fg}>
            <label htmlFor={f("name")}>Full name</label>
            <input {...field("name")} autoComplete="name" required />
            {errorText("name")}
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("phone")}>Phone / WhatsApp</label>
            <input {...field("phone")} type="tel" autoComplete="tel" required />
            {errorText("phone")}
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("message")}>Message</label>
            <textarea {...field("message")} rows={3} defaultValue={defaultMessage} />
            {errorText("message")}
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
              <input {...field("name")} autoComplete="name" required />
              {errorText("name")}
            </div>
            <div className={styles.fg}>
              <label htmlFor={f("phone")}>Phone / WhatsApp</label>
              <input {...field("phone")} type="tel" autoComplete="tel" required />
              {errorText("phone")}
            </div>
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("email")}>Email</label>
            <input {...field("email")} type="email" autoComplete="email" />
            {errorText("email")}
          </div>
          {interest ? null : (
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
          )}
          <div className={styles.fg}>
            <label htmlFor={f("message")}>Message</label>
            <textarea
              {...field("message")}
              rows={4}
              defaultValue={defaultMessage}
              placeholder="Tell us what you're looking for — location, budget, timeline"
            />
            {errorText("message")}
          </div>
        </>
      )}

      {formError ? (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      ) : null}
      <button className="btn btn-navy" type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? "Sending…" : "Send enquiry"}
        {card || pending ? null : <ArrowIcon />}
      </button>
      {/* Always rendered so screen readers announce the message when it appears. */}
      <p className={styles.ok} role="status" data-shown={state?.ok ? "" : undefined}>
        {state?.ok ? state.message : ""}
      </p>
      {card ? null : (
        <p className={styles.note}>By submitting, you agree to be contacted about your enquiry.</p>
      )}
    </form>
  );
}
