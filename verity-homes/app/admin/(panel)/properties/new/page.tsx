import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { EditorCancel, PropertyEditor } from "@/components/admin/properties/property-editor";
import { siteHost } from "@/components/admin/properties/site-host";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_PROPERTY } from "@/lib/validation/property";

export const metadata: Metadata = { title: "Add property" };

/** /admin/properties/new: a blank editor; the first save creates a draft. */
export default async function NewPropertyPage() {
  await connection();
  await requireAdmin();
  return (
    <>
      <AdminTopbar title="Add property" crumb="Properties / New" actions={<EditorCancel />} />
      <AdminContent>
        <PropertyEditor initialValues={EMPTY_PROPERTY} siteHost={siteHost()} />
      </AdminContent>
    </>
  );
}
