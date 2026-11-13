import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PlanEditor } from "@/components/admin/plans/plan-editor";
import ui from "@/components/admin/ui.module.css";
import { getHighlightedPlan } from "@/lib/db/queries/admin-plans";
import { EMPTY_PLAN } from "@/lib/validation/plan";

export const metadata: Metadata = { title: "Add plan" };

export default async function NewPlanPage() {
  const highlighted = await getHighlightedPlan();
  return (
    <>
      <AdminTopbar
        title="Add plan"
        crumb="Investment plans / New"
        actions={
          <Link href="/admin/plans" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PlanEditor initialValues={EMPTY_PLAN} highlighted={highlighted} />
      </AdminContent>
    </>
  );
}
