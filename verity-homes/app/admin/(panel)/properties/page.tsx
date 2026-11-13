import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { AddPropertyButton } from "@/components/admin/dashboard/dashboard";
import { PropertySearch, PropertyTypeFilter } from "@/components/admin/properties/property-filters";
import { Pager, PropertyTable, StatusTabs } from "@/components/admin/properties/property-table";
import styles from "@/components/admin/properties/properties.module.css";
import ui from "@/components/admin/ui.module.css";
import { listAdminProperties } from "@/lib/db/queries/admin-properties";
import { parseAdminPropertyFilters } from "@/lib/validation/admin-property-filters";

export const metadata: Metadata = { title: "Properties" };

/**
 * /admin/properties (design/admin-properties.html): status tabs with live counts, search and
 * listing-type filter in the URL, table with row actions. Live data (listAdminProperties calls
 * requireAdmin() and is not cached), inside the (panel) layout's <Suspense> gate.
 */
export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminPropertyFilters(await searchParams);
  const list = await listAdminProperties(filters);
  const filtered = Boolean(filters.q || filters.type || filters.status !== "all");
  return (
    <>
      <AdminTopbar title="Properties" crumb="Content" actions={<AddPropertyButton />} />
      <AdminContent>
        <div className={styles.toolbar}>
          <div className={styles.left}>
            <StatusTabs filters={filters} counts={list.counts} />
            <PropertySearch key={filters.q} filters={filters} />
          </div>
          <div className={styles.right}>
            <PropertyTypeFilter filters={filters} />
          </div>
        </div>
        {list.rows.length ? (
          <>
            <PropertyTable list={list} now={new Date()} />
            <Pager list={list} filters={filters} />
          </>
        ) : (
          <div className={`${styles.tableWrap} ${styles.empty}`}>
            {filtered ? (
              <>
                <b>No properties match</b>
                <p>Try another search, type or status.</p>
                <Link className={`${ui.btn} ${ui.ghost}`} href="/admin/properties" prefetch={false}>
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                <b>No properties yet</b>
                <p>Add your first listing — it stays a draft until you publish it.</p>
                <Link
                  className={`${ui.btn} ${ui.navy}`}
                  href="/admin/properties/new"
                  prefetch={false}
                >
                  Add a property
                </Link>
              </>
            )}
          </div>
        )}
      </AdminContent>
    </>
  );
}
