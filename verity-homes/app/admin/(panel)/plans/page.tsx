import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { dashboardStyles } from "@/components/admin/dashboard/dashboard";
import { AdminIcon } from "@/components/admin/icons";
import { PlanTable } from "@/components/admin/plans/plan-table";
import propStyles from "@/components/admin/properties/properties.module.css";
import ui from "@/components/admin/ui.module.css";
import { listAdminPlans } from "@/lib/db/queries/admin-plans";

export const metadata: Metadata = { title: "Investment plans" };

/** /admin/plans (Unit 17): every plan in /invest order; drag or ↑↓ to reorder. Always live. */
export default async function AdminPlansPage() {
  const plans = await listAdminPlans();
  const published = plans.filter((p) => p.status === "PUBLISHED").length;
  return (
    <>
      <AdminTopbar
        title="Investment plans"
        crumb="Content"
        actions={
          // Same top-bar button as "Add property": icon-only on phones.
          <Link className={dashboardStyles.addBtn} href="/admin/plans/new" prefetch={false}>
            <AdminIcon name="plus" />
            <span className={dashboardStyles.addLabel}>Add plan</span>
          </Link>
        }
      />
      <AdminContent>
        {plans.length ? (
          <>
            <PlanTable
              // re-sync the table's own order state whenever the server data changes
              key={plans.map((p) => `${p.id}:${p.status}:${p.highlighted}:${p.name}`).join()}
              plans={plans}
            />
            <div className={propStyles.pager}>
              <span>
                {plans.length} {plans.length === 1 ? "plan" : "plans"} · {published} on /invest
              </span>
              <span>Drag a row, or use ↑ ↓, to change the order on /invest.</span>
            </div>
          </>
        ) : (
          <div className={`${propStyles.tableWrap} ${propStyles.empty}`}>
            <b>No investment plans yet</b>
            <p>Add a plan — it stays a draft until you publish it.</p>
            <Link className={`${ui.btn} ${ui.navy}`} href="/admin/plans/new" prefetch={false}>
              Add a plan
            </Link>
          </div>
        )}
      </AdminContent>
    </>
  );
}
