"use client";

import { useActionState, useEffect, useId, useRef, startTransition } from "react";
import { onPlanSelected } from "@/lib/invest-plan-select";
import { createEnquiry, type EnquiryField, type EnquiryState } from "@/lib/actions/enquiry";
import { ArrowIcon } from "./icons";
import { PillTicker } from "./pill-ticker";
import styles from "./enquiry-form.module.css";

const INTERESTS = [
  { value: "INVESTING", label: "Investing" },
  { value: "BUYING", label: "Buying" },
  { value: "RENTING", label: "Renting" },
  { value: "LAND", label: "Land" },
  { value: "MANAGEMENT", label: "Management" },
] as const;

/** Contact page select (Unit 8). */
const CONTACT_INTERESTS = [
  { value: "BUYING", label: "Buying" },
  { value: "RENTING", label: "Renting" },
  { value: "LAND", label: "Land" },
  { value: "INVESTING", label: "Investing" },
  { value: "MANAGEMENT", label: "Management" },
  { value: "LISTING", label: "Listing my property" },
] as const;

type EnquiryInterest = "BUYING" | "RENTING" | "LAND" | "INVESTING" | "MANAGEMENT" | "LISTING";

/** Field order on screen: the first one with an error gets focus. */
const FIELD_ORDER: EnquiryField[] = ["name", "phone", "email", "amount", "message"];

type EnquiryFormProps = {
  /** EnquirySource for lib/validation/enquiry.ts. */
  source: "HOME_PAGE" | "PROPERTY_PAGE" | "INVEST_PAGE" | "CONTACT_PAGE";
  id?: string;
  /**
   * "full" (home/contact): name, phone, email, interest chips, message.
   * "card" (property sidebar, design `.card.enq`): name, phone, message, inspection checkbox.
   * "contact" (contact page, design `.c-grid form`): soft pill fields, first + last name
   * (sent together as `name`), phone, email, interest select, message, "Get a call back".
   * "invest" (/invest, design "Investment enquiry"): name, phone, email, plan select (from
   * `plans`, plus "Not sure yet"), amount in naira, "Request a call back".
   */
  variant?: "full" | "card" | "contact" | "invest";
  /** Heading shown at the top of the form. */
  heading?: string;
  /** Accessible name for the form; defaults to the heading. */
  label?: string;
  /** Property being enquired about (property page). */
  propertyId?: string;
  /** Investment plan being enquired about: preselected in the "invest" variant's plan select,
   * a hidden field elsewhere. */
  planId?: string;
  /** Published plans for the "invest" variant's select. */
  plans?: { id: string; name: string }[];
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
  plans = [],
  interest,
  defaultMessage,
}: EnquiryFormProps) {
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;
  const card = variant === "card";
  const contact = variant === "contact";
  const invest = variant === "invest";
  // Plan select (invest variant): uncontrolled, so form.reset() restores it like the other
  // fields. A plan card's "I want to invest" preselects its plan through the ref.
  const planRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!invest) return;
    return onPlanSelected((id) => {
      if (planRef.current && plans.some((p) => p.id === id)) planRef.current.value = id;
    });
  }, [invest, plans]);
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
    // By id: on the contact variant the name error sits on the first-name input.
    const first = FIELD_ORDER.find((k) => state.fieldErrors?.[k]);
    const el = first ? form.ownerDocument.getElementById(f(first)) : null;
    if (el instanceof HTMLElement) el.focus();
    // f() is stable for the life of the component (useId).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className={card ? styles.card : contact ? styles.contact : styles.form}
      id={id}
      noValidate
      {...(label ? { "aria-label": label } : { "aria-labelledby": f("h") })}
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting.current || pending) return; // no double submit
        submitting.current = true;
        const data = new FormData(e.currentTarget);
        data.set("startedAt", String(startedAt.current));
        if (contact) {
          const full = `${data.get("firstName") ?? ""} ${data.get("lastName") ?? ""}`.trim();
          data.set("name", full);
          data.delete("firstName");
          data.delete("lastName");
        }
        startTransition(() => formAction(data));
      }}
    >
      {contact ? (
        <>
          <PillTicker label="Quick enquiry" />
          <h2 id={f("h")}>{heading}</h2>
        </>
      ) : (
        <h3 id={f("h")}>{heading}</h3>
      )}
      <input type="hidden" name="source" value={source} />
      {propertyId ? <input type="hidden" name="propertyId" value={propertyId} /> : null}
      {planId && !invest ? <input type="hidden" name="planId" value={planId} /> : null}
      {interest && !contact ? <input type="hidden" name="interest" value={interest} /> : null}
      {/* Honeypot: invisible to people, tempting to bots. Must stay empty. */}
      <div className={styles.hp} aria-hidden="true">
        <label htmlFor={f("company")}>Company</label>
        <input id={f("company")} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {contact ? (
        <>
          <div className={styles.two}>
            <div className={styles.fg}>
              <label htmlFor={f("name")}>
                First name
                <Req />
              </label>
              <input {...field("name")} name="firstName" autoComplete="given-name" required />
              {errorText("name")}
            </div>
            <div className={styles.fg}>
              <label htmlFor={f("last")}>Last name</label>
              <input id={f("last")} name="lastName" autoComplete="family-name" />
            </div>
          </div>
          <div className={styles.two}>
            <div className={styles.fg}>
              <label htmlFor={f("phone")}>
                Phone / WhatsApp
                <Req />
              </label>
              <input {...field("phone")} type="tel" autoComplete="tel" required />
              {errorText("phone")}
            </div>
            <div className={styles.fg}>
              <label htmlFor={f("email")}>Email</label>
              <input {...field("email")} type="email" autoComplete="email" />
              {errorText("email")}
            </div>
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("interest")}>I&apos;m interested in</label>
            <select id={f("interest")} name="interest" defaultValue={interest ?? "BUYING"}>
              {CONTACT_INTERESTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fg}>
            <label htmlFor={f("message")}>Message</label>
            <textarea {...field("message")} rows={5} defaultValue={defaultMessage} />
            {errorText("message")}
          </div>
        </>
      ) : invest ? (
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
          <div className={styles.row}>
            <div className={styles.fg}>
              <label htmlFor={f("plan")}>Plan</label>
              <select id={f("plan")} name="planId" ref={planRef} defaultValue={planId ?? ""}>
                <option value="">Not sure yet</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.fg}>
              <label htmlFor={f("amount")}>Amount (₦)</label>
              <input {...field("amount")} inputMode="numeric" placeholder="e.g. 2,500,000" />
              {errorText("amount")}
            </div>
          </div>
        </>
      ) : card ? (
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
      {contact ? (
        <div className={styles.submitRow}>
          <p className={styles.note}>
            Required fields are marked <span aria-hidden="true">*</span>. We&apos;ll never share
            your details.
          </p>
          <button className="btn btn-gold" type="submit" disabled={pending} aria-disabled={pending}>
            {pending ? "Sending…" : "Get a call back"}
            {pending ? null : <ArrowIcon />}
          </button>
        </div>
      ) : (
        <button className="btn btn-navy" type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Sending…" : invest ? "Request a call back" : "Send enquiry"}
          {card || invest || pending ? null : <ArrowIcon />}
        </button>
      )}
      {/* Always rendered so screen readers announce the message when it appears. */}
      <p className={styles.ok} role="status" data-shown={state?.ok ? "" : undefined}>
        {state?.ok ? state.message : ""}
      </p>
      {card || contact || invest ? null : (
        <p className={styles.note}>By submitting, you agree to be contacted about your enquiry.</p>
      )}
    </form>
  );
}

/** Required-field marker (the note under the form explains it). */
function Req() {
  return (
    <span className={styles.req} aria-hidden="true">
      {" "}
      *
    </span>
  );
}
