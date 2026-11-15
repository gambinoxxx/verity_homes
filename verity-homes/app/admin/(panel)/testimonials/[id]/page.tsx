import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { TestimonialEditor } from "@/components/admin/trust/testimonial-editor";
import ui from "@/components/admin/ui.module.css";
import { getAdminTestimonial } from "@/lib/db/queries/admin-trust";
import { blobPathPrefix } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit testimonial" };

/** /admin/testimonials/[id]: the editor (read live via requireAdmin()); not keyed on save. */
export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getAdminTestimonial(id);
  if (!row) notFound();
  return (
    <>
      <AdminTopbar
        title="Edit testimonial"
        crumb={`Testimonials / ${row.values.name}`}
        actions={
          <Link href="/admin/testimonials" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <TestimonialEditor
          key={row.id}
          testimonial={{ id: row.id, status: row.status }}
          initialValues={row.values}
          uploadPrefix={blobPathPrefix()}
        />
      </AdminContent>
    </>
  );
}
