"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { subscribe, type SubscribeState } from "@/lib/actions/subscribe";
import styles from "./footer.module.css";

/** Footer email capture (design/index.html), saved by the subscribe server action. */
export function NewsletterForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(subscribe, null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
    else if (state && !state.ok) formRef.current?.querySelector<HTMLInputElement>("#nl")?.focus();
  }, [state]);

  const error = state && !state.ok ? state.error : undefined;
  return (
    <>
      <form
        ref={formRef}
        className={styles.news}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <label htmlFor="nl" className="sr-only">
          Email for new listings
        </label>
        <input
          id="nl"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Your email for new listings"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "nl-msg" : undefined}
        />
        {/* Honeypot: must stay empty. */}
        <div className={styles.hp} aria-hidden="true">
          <label htmlFor="nl-company">Company</label>
          <input id="nl-company" name="company" tabIndex={-1} autoComplete="off" />
        </div>
        <button className="btn btn-gold" type="submit" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      <p
        id="nl-msg"
        className={`${styles.newsMsg} ${error ? styles.newsError : ""}`}
        // A polite live region rather than role="status": the page's enquiry form owns the
        // status role (one per page keeps getByRole("status") unambiguous).
        aria-live={error ? undefined : "polite"}
        role={error ? "alert" : undefined}
      >
        {state ? (state.ok ? state.message : state.error) : ""}
      </p>
    </>
  );
}
