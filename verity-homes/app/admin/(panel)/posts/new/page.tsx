import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { siteHost } from "@/components/admin/properties/site-host";
import ui from "@/components/admin/ui.module.css";
import { listAdminCategories } from "@/lib/db/queries/admin-posts";
import { env } from "@/lib/env";
import { blobPathPrefix } from "@/lib/storage";
import { EMPTY_POST } from "@/lib/validation/post";

export const metadata: Metadata = { title: "Write a post" };

/** /admin/posts/new: a blank editor; the first save creates a draft (images need its id). */
export default async function NewPostPage() {
  await connection();
  const categories = await listAdminCategories();
  return (
    <>
      <AdminTopbar
        title="Write a post"
        crumb="Blog posts / New"
        actions={
          <Link href="/admin/posts" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PostEditor
          initialValues={EMPTY_POST}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          siteHost={siteHost()}
          siteUrl={env.NEXT_PUBLIC_SITE_URL}
          uploadPrefix={blobPathPrefix()}
        />
      </AdminContent>
    </>
  );
}
