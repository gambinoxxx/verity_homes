// Detail panel for the enquiry in ?id= (design/admin-enquiries.html .detail). Server Component;
// the status buttons and the note are client islands. Opening an enquiry never changes its
// status. On phones the panel covers the screen, with a Back link to the list.
import Link from "next/link";
import type { EnquiryDetail } from "@/lib/db/queries/admin-enquiries";
import { initials, lagosLongDate, whatsappReply } from "@/lib/enquiry-inbox";
import { INTEREST_LABEL, SOURCE_LABEL, formatNaira, timeAgo } from "@/lib/format";
import { whatsappLink } from "@/lib/whatsapp";
import ui from "../ui.module.css";
import { EnquiryStatusButtons } from "./enquiry-actions";
import { EnquiryNote } from "./enquiry-note";
import { StatusBadge } from "./enquiry-table";
import styles from "./enquiries.module.css";

const SOURCE_TEXT = {
  HOME_PAGE: "home page",
  PROPERTY_PAGE: "property page",
  INVEST_PAGE: "invest page",
  CONTACT_PAGE: "contact page",
} as const;

/** Nigerian numbers are stored as 234…; show them the way she'd dial: +234 803 000 0000. */
function displayPhone(digits: string): string {
  const m = /^234(\d{3})(\d{3})(\d{4})$/.exec(digits);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

export function EnquiryDetailPanel({
  enquiry: e,
  backHref,
  now,
}: {
  enquiry: EnquiryDetail;
  backHref: string;
  now: Date;
}) {
  const wa = whatsappLink(
    e.phone,
    whatsappReply({
      name: e.name,
      propertyTitle: e.property
        ? e.plot
          ? `the ${e.plot.name} at ${e.property.title}`
          : e.property.title
        : null,
      planName: e.plan ? (e.package ? `${e.plan.name} (${e.package.name})` : e.plan.name) : null,
    }),
  );
  return (
    <aside className={styles.detail} aria-labelledby="enquiry-name" data-testid="enquiry-detail">
      <Link className={styles.back} href={backHref} prefetch={false} scroll={false}>
        ← Back to enquiries
      </Link>
      <div className={styles.who}>
        <span className={styles.av} aria-hidden="true">
          {initials(e.name)}
        </span>
        <div>
          <h2 id="enquiry-name">{e.name}</h2>
          <p>
            <time dateTime={e.createdAt.toISOString()} title={lagosLongDate(e.createdAt)}>
              {timeAgo(e.createdAt, now)}
            </time>{" "}
            · via {SOURCE_TEXT[e.source]}
          </p>
        </div>
      </div>
      <StatusBadge status={e.status} />
      <dl className={styles.dl}>
        <dt>Phone</dt>
        <dd>
          <a href={`tel:+${e.phone}`}>{displayPhone(e.phone)}</a>
        </dd>
        <dt>Email</dt>
        <dd>
          {e.email ? (
            <a href={`mailto:${e.email}`}>{e.email}</a>
          ) : (
            <span className={styles.muted}>Not given</span>
          )}
        </dd>
        <dt>Interest</dt>
        <dd>{INTEREST_LABEL[e.interest]}</dd>
        {e.property ? (
          <>
            <dt>Property</dt>
            <dd>
              {e.property.published ? (
                <a
                  href={`/properties/${e.property.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {e.property.title}
                  <span className="sr-only"> (opens the public page in a new tab)</span>
                </a>
              ) : (
                <>
                  {e.property.title} <span className={styles.muted}>(not published)</span>
                </>
              )}
            </dd>
          </>
        ) : null}
        {e.plot ? (
          <>
            <dt>Plot</dt>
            <dd data-testid="enquiry-plot">
              {e.plot.name} — {formatNaira(e.plot.priceKobo)}
              {e.plot.initialDepositKobo !== null
                ? ` (deposit ${formatNaira(e.plot.initialDepositKobo)})`
                : ""}
            </dd>
          </>
        ) : null}
        {e.package ? (
          <>
            <dt>Package</dt>
            <dd data-testid="enquiry-package">{e.package.summary}</dd>
          </>
        ) : null}
        {e.plan ? (
          <>
            <dt>Plan</dt>
            <dd>
              {e.plan.published ? (
                <a href="/invest#plans-h" target="_blank" rel="noopener noreferrer">
                  {e.plan.name}
                  <span className="sr-only"> (opens the invest page in a new tab)</span>
                </a>
              ) : (
                e.plan.name
              )}
            </dd>
          </>
        ) : null}
        {e.wantsInspection ? (
          <>
            <dt>Inspection</dt>
            <dd>Requested</dd>
          </>
        ) : null}
        {e.amountKobo !== null ? (
          <>
            <dt>Amount</dt>
            <dd>{formatNaira(e.amountKobo)}</dd>
          </>
        ) : null}
        <dt>Source</dt>
        <dd>{SOURCE_LABEL[e.source]}</dd>
        <dt>Received</dt>
        <dd>{lagosLongDate(e.createdAt)}</dd>
      </dl>
      {e.message.trim() ? (
        <blockquote className={styles.message}>{e.message}</blockquote>
      ) : (
        <p className={`${styles.message} ${styles.noMessage}`}>No message.</p>
      )}
      <div className={styles.acts}>
        {wa ? (
          <a className={`${ui.btn} ${ui.gold}`} href={wa} target="_blank" rel="noopener noreferrer">
            WhatsApp
            <span className="sr-only"> {e.name} (opens WhatsApp)</span>
          </a>
        ) : null}
        <a className={`${ui.btn} ${ui.ghost}`} href={`tel:+${e.phone}`}>
          Call
        </a>
        {e.email ? (
          <a className={`${ui.btn} ${ui.ghost}`} href={`mailto:${e.email}`}>
            Email
          </a>
        ) : null}
        <EnquiryStatusButtons id={e.id} status={e.status} />
      </div>
      <EnquiryNote key={e.id} id={e.id} initial={e.note} />
    </aside>
  );
}

export function NoEnquirySelected() {
  return (
    <aside className={`${styles.detail} ${styles.placeholderPanel}`} aria-label="Enquiry details">
      <div className={styles.placeholder}>
        <b>Select an enquiry</b>
        Its details, contact buttons and your private note appear here.
      </div>
    </aside>
  );
}

export function EnquiryNotFound({ backHref }: { backHref: string }) {
  return (
    <aside className={styles.detail} aria-label="Enquiry details">
      <Link className={styles.back} href={backHref} prefetch={false}>
        ← Back to enquiries
      </Link>
      <div className={styles.placeholder}>
        <b>That enquiry isn&apos;t here</b>
        It may have been deleted. Pick another from the list.
      </div>
    </aside>
  );
}
