import Link from "next/link";
import { cacheLife } from "next/cache";
import { prefetchFor } from "@/lib/nav";
import type { SiteSettingsView } from "@/lib/db/queries/settings";
import { Brand } from "./brand";
import { NewsletterForm } from "./newsletter-form";
import styles from "./footer.module.css";

type FooterProps = { settings: SiteSettingsView };

const SOCIALS = [
  {
    key: "instagram",
    label: "Instagram",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  },
  { key: "x", label: "X", icon: <path d="M4 4l16 16M20 4 4 20" /> },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7" />
      </>
    ),
  },
] as const;

// Request-independent, so it can be prerendered with the rest of the shell.
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function Footer({ settings }: FooterProps) {
  const year = await copyrightYear();
  const { phone, email } = settings;

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div>
            <Brand />
            <p>Homes, land and real estate investment plans — handled with honesty.</p>
            <NewsletterForm />
          </div>
          <div className={styles.links}>
            <h2>Explore</h2>
            <Link href="/properties" prefetch={prefetchFor("/properties")}>
              Properties
            </Link>
            <Link href="/invest" prefetch={prefetchFor("/invest")}>
              Invest
            </Link>
            <Link href="/#services" prefetch={prefetchFor("/#services")}>
              Services
            </Link>
            <Link href="/blog" prefetch={prefetchFor("/blog")}>
              Blog
            </Link>
          </div>
          <div className={styles.links}>
            <h2>Company</h2>
            <Link href="/about" prefetch={prefetchFor("/about")}>
              About
            </Link>
            <Link href="/contact" prefetch={prefetchFor("/contact")}>
              Contact
            </Link>
            <Link href="/privacy" prefetch={prefetchFor("/privacy")}>
              Privacy policy
            </Link>
          </div>
          <div>
            <h2>Get in touch</h2>
            <p className={styles.contact}>
              {phone ? (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
              ) : (
                <span className="ph">Phone number</span>
              )}
              <br />
              {email ? (
                <a href={`mailto:${email}`}>{email}</a>
              ) : (
                <span className="ph">Email address</span>
              )}
              <br />
              {settings.officeDisplay}
            </p>
            <div className={styles.socials}>
              {SOCIALS.map(({ key, label, icon }) => {
                const url = settings.socials[key];
                const svg = (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    {icon}
                  </svg>
                );
                // No URL yet: same circle, but not a dead link.
                return url ? (
                  <a
                    key={key}
                    href={url}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {svg}
                  </a>
                ) : (
                  <span key={key} role="img" aria-label={`${label} (link not set yet)`}>
                    {svg}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>
            © {year} {settings.companyName}. All rights reserved.
          </span>
          <span>RC {settings.rcNumber}</span>
        </div>
      </div>
    </footer>
  );
}
