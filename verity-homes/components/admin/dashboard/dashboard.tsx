// /admin dashboard sections (design/admin.html), Server Components only. Pure render from props
// so the empty state and checklist can be tested with fixtures (tests/unit/admin-dashboard.test.ts).
import Link from "next/link";
import {
  ADD_PROPERTY_HREF,
  type ChecklistItem,
  ENQUIRY_STATUS_LABEL,
  type EnquiryStatus,
  QUICK_ACTIONS,
  enquiryHref,
  enquirySubject,
  isAdminRouteBuilt,
} from "@/lib/admin-dashboard";
import type { DashboardStats, LatestEnquiry } from "@/lib/db/queries/admin";
import { timeAgo } from "@/lib/format";
import { AdminIcon } from "../icons";
import styles from "./dashboard.module.css";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function StatCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      key: "new-enquiries",
      label: "New enquiries",
      value: stats.newEnquiries,
      note: stats.newEnquiries === 0 ? "All caught up" : "Waiting for a reply",
      href: "/admin/enquiries",
      hl: true,
    },
    {
      key: "published",
      label: "Published listings",
      value: stats.publishedProperties,
      note: `${stats.featuredProperties} featured on the home page`,
      href: "/admin/properties",
    },
    {
      key: "drafts",
      label: "Drafts",
      value: stats.draftProperties,
      note: "Not visible on the site",
      href: "/admin/properties",
    },
    {
      key: "plans",
      label: "Investment plans",
      value: stats.publishedPlans,
      note: "Live on /invest",
      href: "/admin/plans",
    },
  ];
  return (
    <section className={styles.stats} aria-label="At a glance">
      {cards.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          prefetch={false}
          className={`${styles.stat} ${c.hl ? styles.hl : ""}`}
          data-stat={c.key}
        >
          <small>{c.label}</small>
          <b>{c.value}</b>
          <span>{c.note}</span>
        </Link>
      ))}
    </section>
  );
}

const BADGE_CLASS: Record<EnquiryStatus, string | undefined> = {
  NEW: styles.bNew,
  CONTACTED: styles.bContacted,
  CLOSED: styles.bClosed,
};

export function StatusBadge({ status }: { status: EnquiryStatus }) {
  return (
    <span className={`${styles.badge} ${BADGE_CLASS[status] ?? ""}`}>
      {ENQUIRY_STATUS_LABEL[status]}
    </span>
  );
}

export const EMPTY_ENQUIRIES =
  "No enquiries yet — they'll appear here as soon as someone contacts you.";

export function LatestEnquiries({ items, now }: { items: LatestEnquiry[]; now: Date }) {
  return (
    <section className={styles.panel} aria-labelledby="latest-enquiries-h">
      <h2 id="latest-enquiries-h">
        Latest enquiries
        {items.length ? (
          <Link href="/admin/enquiries" prefetch={false}>
            View all →
          </Link>
        ) : null}
      </h2>
      {items.length ? (
        <ul className={styles.list}>
          {items.map((e) => (
            <li key={e.id}>
              <Link href={enquiryHref(e.id)} prefetch={false} className={styles.row}>
                <span className={styles.who}>
                  <b>{e.name}</b>
                  <small>{enquirySubject(e)}</small>
                </span>
                <span className={styles.meta}>
                  <StatusBadge status={e.status} />
                  <time dateTime={e.createdAt.toISOString()}>{timeAgo(e.createdAt, now)}</time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{EMPTY_ENQUIRIES}</p>
      )}
    </section>
  );
}

export function QuickActions() {
  return (
    <section className={styles.panel} aria-labelledby="quick-actions-h">
      <h2 id="quick-actions-h">Quick actions</h2>
      <div className={styles.quick}>
        {QUICK_ACTIONS.map((a) =>
          isAdminRouteBuilt(a.href) ? (
            <Link key={a.href} href={a.href} prefetch={false} className={styles.action}>
              <AdminIcon name={a.icon} />
              {a.label}
            </Link>
          ) : (
            <div
              key={a.href}
              className={`${styles.action} ${styles.soonAction}`}
              aria-disabled="true"
              data-href={a.href}
            >
              <AdminIcon name={a.icon} />
              {a.label}
              <span className={styles.soon}>Coming soon</span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

/** Shown only while something is missing (items from setupChecklist()). */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  if (!items.length) return null;
  return (
    <section className={styles.panel} aria-labelledby="setup-h" data-testid="setup-checklist">
      <h2 id="setup-h">Before you launch</h2>
      <p className={styles.panelIntro}>
        {items.length} {plural(items.length, "thing", "things")} still to finish. This card
        disappears once they&apos;re all done.
      </p>
      <ul className={styles.checklist}>
        {items.map((item) => (
          <li key={item.key} className={styles.check} data-item={item.key}>
            <div>
              <b>{item.label}</b>
              <small>{item.hint}</small>
            </div>
            {isAdminRouteBuilt(item.href) ? (
              <Link href={item.href} prefetch={false}>
                Fix this →
              </Link>
            ) : (
              <span className={styles.soon}>Coming soon</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Top bar "Add property" (design .btn.btn-navy); icon-only at ≤860px. */
export function AddPropertyButton() {
  const content = (
    <>
      <AdminIcon name="plus" />
      <span className={styles.addLabel}>Add property</span>
    </>
  );
  if (isAdminRouteBuilt(ADD_PROPERTY_HREF)) {
    return (
      <Link href={ADD_PROPERTY_HREF} prefetch={false} className={styles.addBtn}>
        {content}
      </Link>
    );
  }
  return (
    <span
      className={`${styles.addBtn} ${styles.addSoon}`}
      aria-disabled="true"
      title="Coming soon"
      data-href={ADD_PROPERTY_HREF}
    >
      {content}
      <span className={styles.soonTag} aria-hidden="true">
        Soon
      </span>
      <span className="sr-only"> (coming soon)</span>
    </span>
  );
}

export { styles as dashboardStyles };
