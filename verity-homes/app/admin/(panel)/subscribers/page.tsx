import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import table from "@/components/admin/properties/properties.module.css";
import { SubscriberSearch } from "@/components/admin/trust/subscriber-search";
import { SubscriberPager, SubscriberTable } from "@/components/admin/trust/subscriber-table";
import ui from "@/components/admin/ui.module.css";
import { listAdminSubscribers } from "@/lib/db/queries/admin-trust";
import { parseSubscriberFilters, subscribersHref } from "@/lib/subscribers";

export const metadata: Metadata = { title: "Subscribers" };

/**
 * /admin/subscribers (Unit 19b): newsletter sign-ups from the footer, newest first, 50 a page,
 * search in the URL, CSV export of the current search, delete one (data-deletion requests).
 */
export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseSubscriberFilters(await searchParams);
  const list = await listAdminSubscribers(filters);
  const csv = `/api/admin/subscribers/export${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`;
  return (
    <>
      <AdminTopbar
        title="Subscribers"
        crumb="Business"
        actions={
          <a className={`${ui.btn} ${ui.ghost}`} href={csv} download>
            Export CSV
          </a>
        }
      />
      <AdminContent>
        <div className={table.toolbar}>
          <div className={table.left}>
            <SubscriberSearch key={filters.q} filters={filters} />
          </div>
        </div>
        {list.rows.length ? (
          <>
            <SubscriberTable list={list} />
            <SubscriberPager list={list} filters={filters} />
          </>
        ) : (
          <div className={`${table.tableWrap} ${table.empty}`}>
            {filters.q ? (
              <>
                <b>No subscribers match</b>
                <p>Try another search.</p>
                <Link
                  className={`${ui.btn} ${ui.ghost}`}
                  href={subscribersHref({ q: "", page: 1 })}
                  prefetch={false}
                >
                  Clear search
                </Link>
              </>
            ) : (
              <>
                <b>No subscribers yet</b>
                <p>People who sign up in the website footer appear here.</p>
              </>
            )}
          </div>
        )}
      </AdminContent>
    </>
  );
}
