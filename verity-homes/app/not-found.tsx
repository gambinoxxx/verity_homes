import type { Metadata } from "next";
import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import { SiteChrome } from "@/components/site/site-chrome";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Page not found — Verity Homes and Properties",
  description: "Page not found.",
};

// design/404.html. Outside the (site) group, so it wraps itself in the shared chrome.
export default function NotFound() {
  return (
    <SiteChrome>
      <section className={styles.nf}>
        <div>
          <b aria-hidden="true">404</b>
          <h1>This page has moved — or never existed.</h1>
          <p>
            The property or page you&apos;re looking for isn&apos;t here. Try our listings or head
            back home.
          </p>
          <div className={styles.actions}>
            <Link className="btn btn-gold" href="/">
              Back to home
            </Link>
            <Link
              className="btn btn-outline"
              href="/properties"
              prefetch={prefetchFor("/properties")}
            >
              View properties
            </Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
