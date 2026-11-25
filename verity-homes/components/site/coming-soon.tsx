import Link from "next/link";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { env } from "@/lib/env";
import { questionMessage, whatsappLink } from "@/lib/whatsapp";
import styles from "./coming-soon.module.css";

type Props = {
  /** The page it sits on, named in the pre-filled WhatsApp message. */
  path: string;
  /** h2 on a page section of its own; h3 inside a section that already has an h2. */
  headingLevel?: 2 | 3;
};

/**
 * Shown instead of an empty list (no published properties yet): never "0 properties" or an
 * empty grid. WhatsApp opens with a message naming the page; without a number set in site
 * settings only "Make a request" (contact form) is offered.
 */
export async function ComingSoon({ path, headingLevel = 2 }: Props) {
  const { whatsapp } = await getSiteSettings();
  const url = new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
  const wa = whatsappLink(whatsapp, questionMessage("new listings", url));
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={styles.card} data-testid="coming-soon">
      <Heading>New listings coming soon</Heading>
      <p>
        We&apos;re checking new homes and land before they go live. WhatsApp us and we&apos;ll tell
        you what&apos;s available now.
      </p>
      <div className={styles.actions}>
        {wa ? (
          <a
            className="btn btn-gold"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            data-contact="whatsapp"
          >
            WhatsApp us
          </a>
        ) : null}
        <Link className={wa ? "btn btn-outline-dark" : "btn btn-gold"} href="/contact#message">
          Make a request
        </Link>
      </div>
    </div>
  );
}
