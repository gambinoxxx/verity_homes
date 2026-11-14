// /admin/posts table (Unit 18), in the properties list pattern (Unit 14): status tabs with
// counts, table with cover thumbnail and row actions, pager. Server Component; only the delete
// button is client-side. Mobile: the table scrolls inside its box.
import Image from "next/image";
import Link from "next/link";
import { deletePost } from "@/lib/actions/post";
import type { AdminPostList } from "@/lib/db/queries/admin-posts";
import { formatDate, timeAgo } from "@/lib/format";
import { type AdminPostFilters, adminPostsHref } from "@/lib/validation/admin-post-filters";
import { DeleteButton, POST_DELETE_BODY } from "../delete-button";
import { AdminIcon } from "../icons";
import styles from "../properties/properties.module.css";
import ui from "../ui.module.css";
import postStyles from "./posts.module.css";

const TABS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
] as const;

export function PostStatusTabs({
  filters,
  counts,
}: {
  filters: AdminPostFilters;
  counts: AdminPostList["counts"];
}) {
  return (
    <nav className={styles.tabs} aria-label="Status">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={adminPostsHref(filters, { status: t.key })}
          aria-current={filters.status === t.key ? "page" : undefined}
          prefetch={false}
          replace
        >
          {t.label} ({counts[t.key]})
        </Link>
      ))}
    </nav>
  );
}

export function PostTable({ list, now }: { list: AdminPostList; now: Date }) {
  return (
    <div className={styles.tableWrap} role="region" aria-label="Blog posts" tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Post</th>
            <th scope="col">Category</th>
            <th scope="col">Status</th>
            <th scope="col">Published</th>
            <th scope="col">Updated</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {list.rows.map((p) => (
            <tr key={p.id} data-post-id={p.id}>
              <td className={postStyles.postCell}>
                <div className={styles.thumb}>
                  {p.coverUrl ? (
                    <Image src={p.coverUrl} alt="" width={64} height={48} sizes="64px" />
                  ) : (
                    <span className={styles.noPhoto} aria-hidden="true">
                      <AdminIcon name="pen" />
                    </span>
                  )}
                  <span>
                    <b>
                      <Link href={`/admin/posts/${p.id}`} prefetch={false}>
                        {p.title}
                      </Link>
                    </b>
                    <small className={postStyles.slug}>/blog/{p.slug}</small>
                  </span>
                </div>
              </td>
              <td>{p.category ? p.category.name : <span className={styles.muted}>—</span>}</td>
              <td>
                <span className={`${ui.badge} ${p.status === "PUBLISHED" ? ui.pub : ui.draft}`}>
                  {p.status === "PUBLISHED" ? "Published" : "Draft"}
                </span>
              </td>
              <td>
                {p.publishedAt ? (
                  <time dateTime={p.publishedAt.toISOString()}>{formatDate(p.publishedAt)}</time>
                ) : (
                  <span className={styles.muted}>—</span>
                )}
              </td>
              <td>
                <time dateTime={p.updatedAt.toISOString()}>{timeAgo(p.updatedAt, now)}</time>
              </td>
              <td>
                <div className={styles.rowActions}>
                  {p.status === "PUBLISHED" ? (
                    <a
                      className={ui.iconBtn}
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${p.title} on site (opens in a new tab)`}
                    >
                      <AdminIcon name="eye" />
                    </a>
                  ) : null}
                  <Link
                    className={ui.iconBtn}
                    href={`/admin/posts/${p.id}`}
                    prefetch={false}
                    aria-label={`Edit ${p.title}`}
                  >
                    <AdminIcon name="pen" />
                  </Link>
                  <DeleteButton
                    id={p.id}
                    title={p.title}
                    what="post"
                    action={deletePost}
                    body={POST_DELETE_BODY}
                    variant="icon"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PostPager({ list, filters }: { list: AdminPostList; filters: AdminPostFilters }) {
  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.page * list.pageSize, list.total);
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  return (
    <div className={styles.pager}>
      <span>
        Showing {from}–{to} of {list.total}
      </span>
      {pages > 1 ? (
        <nav aria-label="Pages">
          {list.page > 1 ? (
            <Link href={adminPostsHref(filters, { page: list.page - 1 })} prefetch={false}>
              ← Previous
            </Link>
          ) : null}
          {list.page < pages ? (
            <Link href={adminPostsHref(filters, { page: list.page + 1 })} prefetch={false}>
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
      <span>Deleting a post also deletes its images.</span>
    </div>
  );
}
