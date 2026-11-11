"use client";

import styles from "./footer.module.css";

/**
 * Footer email capture, styled as design/index.html. Saving subscribers is not part of
 * Unit 3 (see Open questions in context/progress-tracker.md), so submit is held back
 * instead of sending the address anywhere or pretending it was saved.
 */
export function NewsletterForm() {
  return (
    <form className={styles.news} onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="nl" className="sr-only">
        Email for new listings
      </label>
      <input
        id="nl"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="Your email for new listings"
      />
      <button className="btn btn-gold" type="submit">
        Subscribe
      </button>
    </form>
  );
}
