import type { Metadata } from "next";
import Link from "next/link";
import { AdminContent, AdminTopbar } from "@/components/admin/admin-shell";
import { dashboardStyles } from "@/components/admin/dashboard/dashboard";
import { AdminIcon } from "@/components/admin/icons";
import { PostCategoryFilter, PostSearch } from "@/components/admin/posts/post-filters";
import { PostPager, PostStatusTabs, PostTable } from "@/components/admin/posts/post-table";
import styles from "@/components/admin/properties/properties.module.css";
import ui from "@/components/admin/ui.module.css";
import { listAdminCategories, listAdminPosts } from "@/lib/db/queries/admin-posts";
import { parseAdminPostFilters } from "@/lib/validation/admin-post-filters";

export const metadata: Metadata = { title: "Blog posts" };

/**
 * /admin/posts (Unit 18), in the properties list pattern: status tabs with live counts, search
 * (title/excerpt) and category filter in the URL, table with row actions. Live data
 * (requireAdmin(), not cached), inside the (panel) layout's <Suspense> gate.
 */
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminPostFilters(await searchParams);
  const [list, categories] = await Promise.all([listAdminPosts(filters), listAdminCategories()]);
  const filtered = Boolean(filters.q || filters.category || filters.status !== "all");
  return (
    <>
      <AdminTopbar
        title="Blog posts"
        crumb="Content"
        actions={
          // Same top-bar button as "Add property": icon-only on phones.
          <Link className={dashboardStyles.addBtn} href="/admin/posts/new" prefetch={false}>
            <AdminIcon name="plus" />
            <span className={dashboardStyles.addLabel}>Write a post</span>
          </Link>
        }
      />
      <AdminContent>
        <div className={styles.toolbar}>
          <div className={styles.left}>
            <PostStatusTabs filters={filters} counts={list.counts} />
            <PostSearch key={filters.q} filters={filters} />
          </div>
          <div className={styles.right}>
            <PostCategoryFilter filters={filters} categories={categories} />
          </div>
        </div>
        {list.rows.length ? (
          <>
            <PostTable list={list} now={new Date()} />
            <PostPager list={list} filters={filters} />
          </>
        ) : (
          <div className={`${styles.tableWrap} ${styles.empty}`}>
            {filtered ? (
              <>
                <b>No posts match</b>
                <p>Try another search, category or status.</p>
                <Link className={`${ui.btn} ${ui.ghost}`} href="/admin/posts" prefetch={false}>
                  Clear filters
                </Link>
              </>
            ) : (
              <>
                <b>No blog posts yet</b>
                <p>Write your first article — it stays a draft until you publish it.</p>
                <Link className={`${ui.btn} ${ui.navy}`} href="/admin/posts/new" prefetch={false}>
                  Write a post
                </Link>
              </>
            )}
          </div>
        )}
      </AdminContent>
    </>
  );
}
