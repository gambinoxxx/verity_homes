// /admin/subscribers table (Unit 19b): email, joined (Lagos time), delete with a confirm dialog
// (data-deletion requests under the privacy notice). Server Component; the delete button is
// client-side.
import Link from "next/link";
import { deleteSubscriber } from "@/lib/actions/subscriber-admin";
import type { SubscriberList } from "@/lib/db/queries/admin-trust";
import { lagosLongDate, lagosTimestamp } from "@/lib/enquiry-inbox";
import { type SubscriberFilters, subscribersHref } from "@/lib/subscribers";
import { DeleteButton } from "../delete-button";
import table from "../properties/properties.module.css";

export function SubscriberTable({ list }: { list: SubscriberList }) {
  return (
    <div className={table.tableWrap} role="region" aria-label="Subscribers" tabIndex={0}>
      <table className={table.table} style={{ minWidth: 520 }}>
        <thead>
          <tr>
            <th scope="col">Email</th>
            <th scope="col">Joined (Lagos)</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((s) => (
            <tr key={s.id} data-subscriber-id={s.id}>
              <td>
                <b>{s.email}</b>
              </td>
              <td>
                <time dateTime={s.createdAt.toISOString()} title={lagosLongDate(s.createdAt)}>
                  {lagosTimestamp(s.createdAt)}
                </time>
              </td>
              <td>
                <div className={table.rowActions}>
                  <DeleteButton
                    id={s.id}
                    title={s.email}
                    what="subscriber"
                    action={deleteSubscriber}
                    variant="icon"
                    body="They stop getting the newsletter and their address is erased from this list (a data-deletion request). This can't be undone."
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SubscriberPager({
  list,
  filters,
}: {
  list: SubscriberList;
  filters: SubscriberFilters;
}) {
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <div className={table.pager}>
      <span>
        Showing {from}–{to} of {list.total}
      </span>
      {pages > 1 ? (
        <nav aria-label="Pages">
          {list.page > 1 ? (
            <Link href={subscribersHref(filters, { page: list.page - 1 })} prefetch={false}>
              ← Previous
            </Link>
          ) : null}
          {list.page < pages ? (
            <Link href={subscribersHref(filters, { page: list.page + 1 })} prefetch={false}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
      <span>Newest first · 50 a page</span>
    </div>
  );
}
