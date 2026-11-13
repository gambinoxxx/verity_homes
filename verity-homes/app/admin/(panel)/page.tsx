import type { Metadata } from "next";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import styles from "@/components/admin/admin-shell.module.css";

export const metadata: Metadata = { title: "Dashboard" };

// Unit 12 ships the shell only. Unit 13 builds the dashboard (stats, latest enquiries,
// quick actions) from design/admin.html.
export default function AdminDashboardPage() {
  return (
    <>
      <AdminTopbar title="Dashboard" />
      <AdminContent>
        <section className={styles.panel} aria-labelledby="welcome-h">
          <h2 id="welcome-h">You&apos;re signed in</h2>
          <p>
            The dashboard — new enquiries, listings and quick actions — is coming next. Use the menu
            to move around the admin area as each section is added.
          </p>
        </section>
      </AdminContent>
    </>
  );
}
