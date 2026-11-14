"use client";

// /admin/categories (Unit 18): one page, inline editing. Add, rename (the slug follows the name)
// and delete — only when no post uses the category; otherwise “Move N posts first” links to
// those posts. Alphabetical, like /blog (Q40). Reuses the properties table and editor styles.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/category";
import type { AdminCategory } from "@/lib/db/queries/admin-posts";
import { POST_LIMITS } from "@/lib/validation/post";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import editor from "../properties/editor.module.css";
import table from "../properties/properties.module.css";
import ui from "../ui.module.css";
import styles from "./posts.module.css";

function AddCategory() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className={ui.panel} aria-labelledby="cat-add-h">
      <h2 id="cat-add-h">Add a category</h2>
      <form
        className={styles.catForm}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createCategory({ name });
            if (!res.ok) {
              setError(res.fieldErrors?.name ?? res.error);
              document.getElementById("cat-new")?.focus();
              return;
            }
            setName("");
            setError(null);
            toast.success(res.message);
            router.refresh();
          });
        }}
      >
        <label className="sr-only" htmlFor="cat-new">
          Category name
        </label>
        <input
          id="cat-new"
          className={editor.control}
          value={name}
          maxLength={POST_LIMITS.category}
          placeholder="e.g. Market updates"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cat-new-err" : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
        />
        <button type="submit" className={`${ui.btn} ${ui.navy}`} disabled={pending}>
          <AdminIcon name="plus" />
          {pending ? "Adding…" : "Add category"}
        </button>
        {error ? (
          <span id="cat-new-err" className={editor.err} style={{ flexBasis: "100%" }}>
            {error}
          </span>
        ) : null}
      </form>
    </section>
  );
}

function CategoryRow({ c }: { c: AdminCategory }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputId = `cat-${c.id}-name`;

  const save = () =>
    start(async () => {
      if (name.trim() === c.name) {
        setEditing(false);
        return;
      }
      const res = await updateCategory(c.id, { name });
      if (!res.ok) {
        setError(res.fieldErrors?.name ?? res.error);
        document.getElementById(inputId)?.focus();
        return;
      }
      setEditing(false);
      setError(null);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <tr data-category={c.slug}>
      <td>
        {editing ? (
          <div className={styles.catName}>
            <label className="sr-only" htmlFor={inputId}>
              New name for {c.name}
            </label>
            <input
              id={inputId}
              className={editor.control}
              value={name}
              maxLength={POST_LIMITS.category}
              autoFocus
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-err` : undefined}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  setEditing(false);
                  setName(c.name);
                  setError(null);
                }
              }}
            />
            <button
              type="button"
              className={`${ui.btn} ${ui.navy}`}
              onClick={save}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className={`${ui.btn} ${ui.ghost}`}
              onClick={() => {
                setEditing(false);
                setName(c.name);
                setError(null);
              }}
            >
              Cancel
            </button>
            {error ? (
              <span id={`${inputId}-err`} className={editor.err} style={{ flexBasis: "100%" }}>
                {error}
              </span>
            ) : null}
          </div>
        ) : (
          <b>{c.name}</b>
        )}
      </td>
      <td className={table.muted}>/blog?category={c.slug}</td>
      <td>
        {c.postCount === 0 ? (
          <span className={table.muted}>0</span>
        ) : (
          <Link href={`/admin/posts?category=${c.slug}`} prefetch={false}>
            {c.postCount} {c.postCount === 1 ? "post" : "posts"}
          </Link>
        )}
      </td>
      <td>
        <div className={table.rowActions}>
          {editing ? null : (
            <button
              type="button"
              className={ui.iconBtn}
              aria-label={`Rename ${c.name}`}
              onClick={() => setEditing(true)}
            >
              <AdminIcon name="pen" />
            </button>
          )}
          {c.postCount > 0 ? (
            <>
              <span className={styles.blocked} data-testid="delete-blocked">
                Move {c.postCount} {c.postCount === 1 ? "post" : "posts"} first
              </span>
              <button
                type="button"
                className={ui.iconBtn}
                disabled
                aria-label={`Delete ${c.name} (move its ${c.postCount === 1 ? "post" : "posts"} to another category first)`}
              >
                <AdminIcon name="trash" />
              </button>
            </>
          ) : (
            <DeleteButton
              id={c.id}
              title={c.name}
              what="category"
              action={deleteCategory}
              variant="icon"
              body="No posts use it. It disappears from the blog's category list. This can't be undone."
            />
          )}
        </div>
      </td>
    </tr>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  return (
    <>
      <AddCategory />
      {categories.length ? (
        <div className={table.tableWrap} role="region" aria-label="Categories" tabIndex={0}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Blog filter</th>
                <th scope="col">Posts</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                // remount after a rename so the row's own state starts from the new name
                <CategoryRow key={`${c.id}:${c.name}:${c.postCount}`} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${table.tableWrap} ${table.empty}`}>
          <b>No categories yet</b>
          <p>Add one above — every published post needs a category.</p>
        </div>
      )}
    </>
  );
}
