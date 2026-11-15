import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PartnerEditor } from "@/components/admin/trust/partner-editor";
import ui from "@/components/admin/ui.module.css";
import { getAdminPartner } from "@/lib/db/queries/admin-trust";
import { blobPathPrefix } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit partner" };

/** /admin/partners/[id]: the editor (read live via requireAdmin()); not keyed on save. */
export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getAdminPartner(id);
  if (!row) notFound();
  return (
    <>
      <AdminTopbar
        title="Edit partner"
        crumb={`Partners / ${row.values.name}`}
        actions={
          <Link href="/admin/partners" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PartnerEditor
          key={row.id}
          partner={{ id: row.id, status: row.status }}
          initialValues={row.values}
          uploadPrefix={blobPathPrefix()}
        />
      </AdminContent>
    </>
  );
}
