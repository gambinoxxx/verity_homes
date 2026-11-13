import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PlanEditor } from "@/components/admin/plans/plan-editor";
import ui from "@/components/admin/ui.module.css";
import { getAdminPlan, getHighlightedPlan } from "@/lib/db/queries/admin-plans";

export const metadata: Metadata = { title: "Edit plan" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, highlighted] = await Promise.all([getAdminPlan(id), getHighlightedPlan()]);
  if (!plan) notFound();
  return (
    <>
      <AdminTopbar
        title="Edit plan"
        crumb={`Investment plans / ${plan.values.name}`}
        actions={
          <Link href="/admin/plans" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PlanEditor
          key={`${plan.id}-${plan.updatedAt.toISOString()}-${plan.status}`}
          plan={{
            id: plan.id,
            status: plan.status,
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString(),
            enquiryCount: plan.enquiryCount,
          }}
          initialValues={plan.values}
          highlighted={highlighted}
        />
      </AdminContent>
    </>
  );
}
