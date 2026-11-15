import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { dashboardStyles } from "@/components/admin/dashboard/dashboard";
import { AdminIcon } from "@/components/admin/icons";
import table from "@/components/admin/properties/properties.module.css";
import { PartnerTable } from "@/components/admin/trust/partner-table";
import ui from "@/components/admin/ui.module.css";
import { listAdminPartners } from "@/lib/db/queries/admin-trust";

export const metadata: Metadata = { title: "Partners" };

/** /admin/partners (Unit 19b): partner logos in marquee order (home and /about); only published ones with permission show. Always live. */
export default async function AdminPartnersPage() {
  const rows = await listAdminPartners();
  const published = rows.filter((r) => r.status === "PUBLISHED").length;
  return (
    <>
      <AdminTopbar
        title="Partners"
        crumb="Content"
        actions={
          <Link className={dashboardStyles.addBtn} href="/admin/partners/new" prefetch={false}>
            <AdminIcon name="plus" />
            <span className={dashboardStyles.addLabel}>Add partner</span>
          </Link>
        }
      />
      <AdminContent>
        {rows.length ? (
          <>
            <PartnerTable
              key={rows.map((r) => `${r.id}:${r.status}:${r.consentConfirmed}:${r.name}`).join()}
              rows={rows}
            />
            <div className={table.pager}>
              <span>
                {rows.length} in total · {published} published
              </span>
              <span>Drag a row, or use ↑ ↓, to change the order on the site.</span>
            </div>
          </>
        ) : (
          <div className={`${table.tableWrap} ${table.empty}`}>
            <b>No partners yet</b>
            <p>Add one — its logo shows only once you have permission to display it.</p>
            <Link className={`${ui.btn} ${ui.navy}`} href="/admin/partners/new" prefetch={false}>
              Add partner
            </Link>
          </div>
        )}
      </AdminContent>
    </>
  );
}
