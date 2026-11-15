import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { TestimonialEditor } from "@/components/admin/trust/testimonial-editor";
import ui from "@/components/admin/ui.module.css";
import { requireAdmin } from "@/lib/auth";
import { blobPathPrefix } from "@/lib/storage";
import { EMPTY_TESTIMONIAL } from "@/lib/validation/trust";

export const metadata: Metadata = { title: "Add testimonial" };

/** /admin/testimonials/new: a blank editor; the first save creates a draft (images need its id). */
export default async function NewTestimonialPage() {
  await connection();
  await requireAdmin();
  return (
    <>
      <AdminTopbar
        title="Add testimonial"
        crumb="Testimonials / New"
        actions={
          <Link href="/admin/testimonials" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <TestimonialEditor initialValues={EMPTY_TESTIMONIAL} uploadPrefix={blobPathPrefix()} />
      </AdminContent>
    </>
  );
}
