// /admin/enquiries table (design/admin-enquiries.html). Server Component. Each row's name is a
// link to ?id=<id> stretched over the row, so the whole row opens the enquiry and it works
// with the keyboard. NEW enquiries are bold.
import Link from "next/link";
import { isAdminRouteBuilt } from "@/lib/admin-dashboard";
import type { EnquiryList } from "@/lib/db/queries/admin-enquiries";
import { lagosLongDate } from "@/lib/enquiry-inbox";
import { INTEREST_LABEL, SOURCE_LABEL, timeAgo } from "@/lib/format";
import {
  ENQUIRY_TABS,
  type EnquiryFilters,
  enquiriesHref,
} from "@/lib/validation/admin-enquiry-filters";
import propStyles from "../properties/properties.module.css";
import ui from "../ui.module.css";
import styles from "./enquiries.module.css";

const TAB_LABEL = { all: "All", new: "New", contacted: "Contacted", closed: "Closed" } as const;
export const STATUS_BADGE = {
  NEW: { label: "New", className: ui.bNew },
  CONTACTED: { label: "Contacted", className: ui.bContacted },
  CLOSED: { label: "Closed", className: ui.bClosed },
} as const;

export function StatusBadge({ status }: { status: keyof typeof STATUS_BADGE }) {
  const b = STATUS_BADGE[status];
  return <span className={`${ui.badge} ${b.className}`}>{b.label}</span>;
}

export function EnquiryTabs({
  filters,
  counts,
}: {
  filters: EnquiryFilters;
  counts: EnquiryList["counts"];
}) {
  return (
    <nav className={propStyles.tabs} aria-label="Status">
      {ENQUIRY_TABS.map((t) => (
        <Link
          key={t}
          href={enquiriesHref(filters, { status: t })}
          aria-current={filters.status === t ? "page" : undefined}
          prefetch={false}
          replace
        >
          {TAB_LABEL[t]} ({counts[t]})
        </Link>
      ))}
    </nav>
  );
}

export function EnquiryTable({
  list,
  filters,
  now,
}: {
  list: EnquiryList;
  filters: EnquiryFilters;
  now: Date;
}) {
  const plansBuilt = isAdminRouteBuilt("/admin/plans");
  return (
    <div className={propStyles.tableWrap} role="region" aria-label="Enquiries" tabIndex={0}>
      <table className={propStyles.table}>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Interested in</th>
            <th scope="col">About</th>
            <th scope="col">Status</th>
            <th scope="col">Received</th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((e) => {
            const selected = filters.id === e.id;
            return (
              <tr
                key={e.id}
                data-enquiry-id={e.id}
                className={`${styles.row} ${e.status === "NEW" ? styles.unread : ""} ${selected ? styles.selected : ""}`}
              >
                <td>
                  <Link
                    className={styles.open}
                    href={enquiriesHref(filters, { id: e.id })}
                    aria-current={selected ? "true" : undefined}
                    prefetch={false}
                    scroll={false}
                  >
                    {e.name}
                  </Link>
                </td>
                <td>
                  {INTEREST_LABEL[e.interest]}
                  <small className={styles.via}>via {SOURCE_LABEL[e.source].toLowerCase()}</small>
                </td>
                <td>
                  {e.property ? (
                    <Link
                      className={styles.above}
                      href={`/admin/properties/${e.property.id}`}
                      prefetch={false}
                    >
                      {e.property.title}
                    </Link>
                  ) : e.plan ? (
                    plansBuilt ? (
                      <Link
                        className={styles.above}
                        href={`/admin/plans/${e.plan.id}`}
                        prefetch={false}
                      >
                        Plan: {e.plan.name}
                      </Link>
                    ) : (
                      <>Plan: {e.plan.name}</>
                    )
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td>
                  <time dateTime={e.createdAt.toISOString()} title={lagosLongDate(e.createdAt)}>
                    {timeAgo(e.createdAt, now)}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function EnquiryPager({ list, filters }: { list: EnquiryList; filters: EnquiryFilters }) {
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <div className={propStyles.pager}>
      <span>
        Showing {from}–{to} of {list.total}
      </span>
      {pages > 1 ? (
        <nav aria-label="Pages">
          {list.page > 1 ? (
            <Link href={enquiriesHref(filters, { page: list.page - 1, id: null })} prefetch={false}>
              ← Newer
            </Link>
          ) : null}
          {list.page < pages ? (
            <Link href={enquiriesHref(filters, { page: list.page + 1, id: null })} prefetch={false}>
              Older →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
