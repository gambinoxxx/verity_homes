import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PartnerEditor } from "@/components/admin/trust/partner-editor";
import ui from "@/components/admin/ui.module.css";
import { requireAdmin } from "@/lib/auth";
import { blobPathPrefix } from "@/lib/storage";
import { EMPTY_PARTNER } from "@/lib/validation/trust";

export const metadata: Metadata = { title: "Add partner" };

/** /admin/partners/new: a blank editor; the first save creates a draft (images need its id). */
export default async function NewPartnerPage() {
  await connection();
  await requireAdmin();
  return (
    <>
      <AdminTopbar
        title="Add partner"
        crumb="Partners / New"
        actions={
          <Link href="/admin/partners" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PartnerEditor initialValues={EMPTY_PARTNER} uploadPrefix={blobPathPrefix()} />
      </AdminContent>
    </>
  );
}
