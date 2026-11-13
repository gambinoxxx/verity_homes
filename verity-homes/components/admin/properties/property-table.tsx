// /admin/properties table (design/admin-properties.html). Server Component; only the delete
// button is client-side. Mobile: the table scrolls inside its box.
import Image from "next/image";
import Link from "next/link";
import type { AdminPropertyList } from "@/lib/db/queries/admin-properties";
import { LISTING_LABEL, formatPrice, timeAgo } from "@/lib/format";
import {
  type AdminPropertyFilters,
  adminPropertiesHref,
} from "@/lib/validation/admin-property-filters";
import { AdminIcon } from "../icons";
import ui from "../ui.module.css";
import { DeletePropertyButton } from "./delete-property-button";
import styles from "./properties.module.css";

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
] as const;

export function StatusTabs({
  filters,
  counts,
}: {
  filters: AdminPropertyFilters;
  counts: AdminPropertyList["counts"];
}) {
  return (
    <nav className={styles.tabs} aria-label="Status">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={adminPropertiesHref(filters, { status: t.key })}
          aria-current={filters.status === t.key ? "page" : undefined}
          prefetch={false}
          replace
        >
          {t.label} ({counts[t.key]})
        </Link>
      ))}
    </nav>
  );
}

export function PropertyTable({ list, now }: { list: AdminPropertyList; now: Date }) {
  return (
    <div className={styles.tableWrap} role="region" aria-label="Properties" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">Type</th>
            <th scope="col">Price</th>
            <th scope="col">Status</th>
            <th scope="col">Home page</th>
            <th scope="col">Updated</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((p) => (
            <tr key={p.id} data-property-id={p.id}>
              <td>
                <div className={styles.thumb}>
                  {p.cover ? (
                    <Image src={p.cover.url} alt="" width={64} height={48} sizes="64px" />
                  ) : (
                    <span className={styles.noPhoto} aria-hidden="true">
                      <AdminIcon name="home" />
                    </span>
                  )}
                  <span>
                    <b>
                      <Link href={`/admin/properties/${p.id}`} prefetch={false}>
                        {p.title}
                      </Link>
                    </b>
                    <small>{p.area ? `${p.area}, ${p.city}` : "No area yet"}</small>
                  </span>
                </div>
              </td>
              <td>{LISTING_LABEL[p.listingType]}</td>
              <td>
                {p.priceOnRequest || p.priceKobo !== null ? (
                  formatPrice(p)
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>
                <span className={`${ui.badge} ${p.status === "PUBLISHED" ? ui.pub : ui.draft}`}>
                  {p.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </td>
              <td>
                {p.featured || p.showcase ? (
                  <>
                    {p.featured ? <span className={styles.feat}>★ Featured</span> : null}
                    {p.showcase ? <span className={styles.feat}>◆ Showcase</span> : null}
                  </>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>
                <time dateTime={p.updatedAt.toISOString()}>{timeAgo(p.updatedAt, now)}</time>
              </td>
              <td>
                <div className={styles.rowActions}>
                  {p.status === "PUBLISHED" ? (
                    <a
                      className={ui.iconBtn}
                      href={`/properties/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${p.title} on site (opens in a new tab)`}
                    >
                      <AdminIcon name="eye" />
                    </a>
                  ) : null}
                  <Link
                    className={ui.iconBtn}
                    href={`/admin/properties/${p.id}`}
                    prefetch={false}
                    aria-label={`Edit ${p.title}`}
                  >
                    <AdminIcon name="pen" />
                  </Link>
                  <DeletePropertyButton id={p.id} title={p.title} variant="icon" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({
  list,
  filters,
}: {
  list: AdminPropertyList;
  filters: AdminPropertyFilters;
}) {
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <div className={styles.pager}>
      <span>
        Showing {from}–{to} of {list.total}
      </span>
      {pages > 1 ? (
        <nav aria-label="Pages">
          {list.page > 1 ? (
            <Link href={adminPropertiesHref(filters, { page: list.page - 1 })} prefetch={false}>
              ← Previous
            </Link>
          ) : null}
          {list.page < pages ? (
            <Link href={adminPropertiesHref(filters, { page: list.page + 1 })} prefetch={false}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
      <span>Deleting a property also deletes its photos.</span>
    </div>
  );
}
