import type { Metadata } from "next";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import {
  AddPropertyButton,
  LatestEnquiries,
  QuickActions,
  SetupChecklist,
  StatCards,
  dashboardStyles as styles,
} from "@/components/admin/dashboard/dashboard";
import { setupChecklist } from "@/lib/admin-dashboard";
import { getDashboardStats, getLatestEnquiries, getSetupStatus } from "@/lib/db/queries/admin";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * /admin (design/admin.html, without its "Sample data" alert). Live, uncached numbers: each
 * query calls requireAdmin() itself. Rendered inside the (panel) layout's <Suspense> gate.
 */
export default async function AdminDashboardPage() {
  const [stats, latest, setup] = await Promise.all([
    getDashboardStats(),
    getLatestEnquiries(5),
    getSetupStatus(),
  ]);
  const now = new Date();
  return (
    <>
      <AdminTopbar title="Dashboard" actions={<AddPropertyButton />} />
      <AdminContent>
        <StatCards stats={stats} />
        <div className={styles.grid2}>
          <LatestEnquiries items={latest} now={now} />
          <QuickActions />
        </div>
        <SetupChecklist items={setupChecklist(setup)} />
      </AdminContent>
    </>
  );
}
