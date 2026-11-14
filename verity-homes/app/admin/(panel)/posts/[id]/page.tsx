import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { PostEditor } from "@/components/admin/posts/post-editor";
import { siteHost } from "@/components/admin/properties/site-host";
import ui from "@/components/admin/ui.module.css";
import { getAdminPost, listAdminCategories } from "@/lib/db/queries/admin-posts";
import { env } from "@/lib/env";
import { blobPathPrefix } from "@/lib/storage";

export const metadata: Metadata = { title: "Edit post" };

/** /admin/posts/[id]: the editor for one post (drafts included, read live via requireAdmin()). */
export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, categories] = await Promise.all([getAdminPost(id), listAdminCategories()]);
  if (!post) notFound();
  return (
    <>
      <AdminTopbar
        title="Edit post"
        crumb={`Blog posts / ${post.values.title}`}
        actions={
          <Link href="/admin/posts" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
            Cancel
          </Link>
        }
      />
      <AdminContent>
        <PostEditor
          key={`${post.id}-${post.updatedAt.toISOString()}-${post.status}`}
          post={{
            id: post.id,
            slug: post.slug,
            status: post.status,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            publishedAt: post.publishedAt?.toISOString() ?? null,
          }}
          initialValues={post.values}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          siteHost={siteHost()}
          siteUrl={env.NEXT_PUBLIC_SITE_URL}
          uploadPrefix={blobPathPrefix()}
        />
      </AdminContent>
    </>
  );
}
