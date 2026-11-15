import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { dashboardStyles } from "@/components/admin/dashboard/dashboard";
import { AdminIcon } from "@/components/admin/icons";
import table from "@/components/admin/properties/properties.module.css";
import { TestimonialTable } from "@/components/admin/trust/testimonial-table";
import ui from "@/components/admin/ui.module.css";
import { listAdminTestimonials } from "@/lib/db/queries/admin-trust";

export const metadata: Metadata = { title: "Testimonials" };

/** /admin/testimonials (Unit 19b): client quotes in home-carousel order; only published ones with permission show. Always live. */
export default async function AdminTestimonialsPage() {
  const rows = await listAdminTestimonials();
  const published = rows.filter((r) => r.status === "PUBLISHED").length;
  return (
    <>
      <AdminTopbar
        title="Testimonials"
        crumb="Content"
        actions={
          <Link className={dashboardStyles.addBtn} href="/admin/testimonials/new" prefetch={false}>
            <AdminIcon name="plus" />
            <span className={dashboardStyles.addLabel}>Add testimonial</span>
          </Link>
        }
      />
      <AdminContent>
        {rows.length ? (
          <>
            <TestimonialTable
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
            <b>No testimonials yet</b>
            <p>Add one — it can only be published once the client has given written permission.</p>
            <Link
              className={`${ui.btn} ${ui.navy}`}
              href="/admin/testimonials/new"
              prefetch={false}
            >
              Add testimonial
            </Link>
          </div>
        )}
      </AdminContent>
    </>
  );
}
