import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import styles from "@/components/admin/admin-shell.module.css";
import { greetingFor } from "@/lib/admin-nav";
import { ForbiddenError, NO_ACCESS_PATH, getAdminUser, requireAdmin } from "@/lib/auth";
import { getNewEnquiryCount } from "@/lib/db/queries/admin";

/**
 * Every admin page except sign-in / no-access. requireAdmin() runs here for every page (proxy.ts
 * already answered signed-out → 307 and non-admin → 403; this is the second layer). auth() is
 * request-time data, so under Cache Components the gate sits in <Suspense>; the shell renders
 * only after the check, so nothing admin-only is ever sent to a non-admin.
 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading admin…</div>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await connection();
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof ForbiddenError) redirect(NO_ACCESS_PATH);
    throw e; // includes requireAdmin's redirect to sign-in
  }
  const [user, newEnquiries] = await Promise.all([getAdminUser(), getNewEnquiryCount()]);
  return (
    <AdminShell
      greeting={greetingFor(new Date())}
      firstName={user?.firstName ?? null}
      newEnquiries={newEnquiries}
    >
      {children}
    </AdminShell>
  );
}
