import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import styles from "@/components/admin/enquiries/enquiries.module.css";
import {
  EnquiryDetailPanel,
  EnquiryNotFound,
  NoEnquirySelected,
} from "@/components/admin/enquiries/enquiry-detail";
import { EnquirySearch, InterestFilter } from "@/components/admin/enquiries/enquiry-filters";
import {
  EnquiryPager,
  EnquiryTable,
  EnquiryTabs,
} from "@/components/admin/enquiries/enquiry-table";
import propStyles from "@/components/admin/properties/properties.module.css";
import ui from "@/components/admin/ui.module.css";
import { getAdminEnquiry, listAdminEnquiries } from "@/lib/db/queries/admin-enquiries";
import {
  enquiriesCsvHref,
  enquiriesHref,
  parseEnquiryFilters,
} from "@/lib/validation/admin-enquiry-filters";

export const metadata: Metadata = { title: "Enquiries" };

/**
 * /admin/enquiries (design/admin-enquiries.html): status tabs with live counts, search and
 * interest filter in the URL, newest first (20 a page), detail panel for ?id=. Always live:
 * the queries call requireAdmin() and are never cached. Opening an enquiry doesn't change it.
 */
export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseEnquiryFilters(await searchParams);
  const [list, open] = await Promise.all([
    listAdminEnquiries(filters),
    filters.id ? getAdminEnquiry(filters.id) : Promise.resolve(null),
  ]);
  const now = new Date();
  const searching = Boolean(filters.q || filters.interest || filters.status !== "all");
  const backHref = enquiriesHref(filters, { id: null });

  return (
    <>
      <AdminTopbar title="Enquiries" crumb="Business" />
      <AdminContent>
        <div className={propStyles.toolbar}>
          <div className={propStyles.left}>
            <EnquiryTabs filters={filters} counts={list.counts} />
            <EnquirySearch key={filters.q} filters={filters} />
            <InterestFilter filters={filters} />
          </div>
          {list.total > 0 ? (
            <a className={`${ui.btn} ${ui.ghost}`} href={enquiriesCsvHref(filters)} download>
              Export CSV
            </a>
          ) : (
            <span
              className={`${ui.btn} ${ui.ghost}`}
              aria-disabled="true"
              title="Nothing to export"
            >
              Export CSV
            </span>
          )}
        </div>
        <div className={styles.splitView}>
          <div>
            {list.rows.length ? (
              <>
                <EnquiryTable list={list} filters={filters} now={now} />
                <EnquiryPager list={list} filters={filters} />
              </>
            ) : (
              <div className={`${propStyles.tableWrap} ${propStyles.empty}`}>
                {list.inboxEmpty ? (
                  <>
                    <b>No enquiries yet</b>
                    <p>
                      Messages from the website&apos;s enquiry forms land here, newest first. You
                      also get an email for each one.
                    </p>
                  </>
                ) : (
                  <>
                    <b>No enquiries match</b>
                    <p>{searching ? "Try another search, interest or status." : "Nothing here."}</p>
                    <Link
                      className={`${ui.btn} ${ui.ghost}`}
                      href="/admin/enquiries"
                      prefetch={false}
                    >
                      Clear filters
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {filters.id ? (
            open ? (
              <EnquiryDetailPanel enquiry={open} backHref={backHref} now={now} />
            ) : (
              <EnquiryNotFound backHref={backHref} />
            )
          ) : list.rows.length ? (
            <NoEnquirySelected />
          ) : null}
        </div>
      </AdminContent>
    </>
  );
}
