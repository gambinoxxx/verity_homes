"use client";

// Blog post editor (Unit 18) for /admin/posts/new and /[id], in the property/plan editor
// pattern: React Hook Form + zodResolver(postSchema) (the same schema runs in the actions), the
// same field shell, panels, Google preview, publish panel, error summary and danger zone.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { type FieldErrors, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createCategory } from "@/lib/actions/category";
import { createPost, deletePost, publishPost, unpublishPost, updatePost } from "@/lib/actions/post";
import { postMetaDescription } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { fieldId } from "@/lib/validation/property";
import {
  POST_FIELD_LABEL,
  POST_LIMITS,
  type PostData,
  type PostFormValues,
  postPublishIssues,
  postSchema,
} from "@/lib/validation/post";
import { DeleteButton, POST_DELETE_BODY } from "../delete-button";
import {
  Field,
  IdScope,
  controlProps,
  useUnsavedChangesWarning,
} from "../properties/editor-inputs";
import editorStyles from "../properties/editor.module.css";
import ui from "../ui.module.css";
import { BodyField, type BodyTab } from "./body-field";
import { CoverField } from "./cover-field";
import styles from "./posts.module.css";

const ORDER = Object.keys(POST_FIELD_LABEL);

function errorList(errors: FieldErrors<PostFormValues>) {
  const e = errors as Record<string, { message?: string } | undefined>;
  const seen = new Set<string>();
  return ORDER.flatMap((k) => {
    const m = e[k]?.message;
    // coverUrl and cover point at the same control: list it once.
    const target = k === "coverUrl" ? "cover" : k;
    if (!m || seen.has(target)) return [];
    seen.add(target);
    return [{ path: target, message: m }];
  });
}

export type PostEditorProps = {
  post?: {
    id: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
  };
  initialValues: PostFormValues;
  categories: { id: string; name: string }[];
  /** Public site origin for the Google preview and the Markdown preview's links. */
  siteHost: string;
  siteUrl: string;
  /** Blob folder prefix ("" or "e2e/"), from lib/storage blobPathPrefix(). */
  uploadPrefix: string;
};

type SaveMode = "draft" | "publish" | "save";

export function PostEditor({
  post,
  initialValues,
  categories: initialCategories,
  siteHost,
  siteUrl,
  uploadPrefix,
}: PostEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tab, setTab] = useState<BodyTab>("write");
  const [categories, setCategories] = useState(initialCategories);
  const published = post?.status === "PUBLISHED";
  const scope = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-`;
  const fid = (p: string) => fieldId(p, scope);
  const cp = (p: string, e?: string, hint?: boolean) => controlProps(scope, p, e, hint);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    setValue,
    reset,
    formState: { errors, isDirty, submitCount },
  } = useForm<PostFormValues, unknown, PostData>({
    resolver: zodResolver(postSchema),
    defaultValues: initialValues,
    shouldFocusError: false,
  });
  useUnsavedChangesWarning(isDirty && !pending);
  const err = (k: string) =>
    (errors as Record<string, { message?: string } | undefined>)[k]?.message;

  const v = useWatch({ control }) as PostFormValues;
  const title = v.title ?? "";
  const content = v.content ?? "";
  const excerpt = v.excerpt ?? "";

  // New post: the web address follows the title until it's edited by hand. The server makes it
  // unique (uniqueSlug) when it was never touched.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  useEffect(() => {
    if (!slugTouched)
      setValue("slug", slugify(title).slice(0, POST_LIMITS.slug), { shouldDirty: true });
  }, [title, slugTouched, setValue]);

  const focus = (path: string) => {
    if (path === "content") setTab("write");
    requestAnimationFrame(() => {
      const el = document.getElementById(fid(path === "coverUrl" ? "cover" : path));
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const applyErrors = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    for (const [k, m] of Object.entries(fieldErrors)) {
      setError(k as Path<PostFormValues>, { type: "server", message: m });
    }
    const first = ORDER.find((k) => k in fieldErrors) ?? Object.keys(fieldErrors)[0];
    if (first) focus(first);
  };

  const payload = (values: PostFormValues): PostFormValues =>
    // On create, an untouched web address is left to the server (uniqueSlug from the title).
    !post && !slugTouched ? { ...values, slug: "" } : values;

  const save = (mode: SaveMode) =>
    handleSubmit(
      () =>
        startTransition(async () => {
          setServerError(null);
          const values = getValues();
          if (mode === "publish") {
            const issues = postPublishIssues({
              title: values.title,
              slug: values.slug || slugify(values.title),
              categoryId: values.categoryId || null,
              excerpt: values.excerpt,
              coverUrl: values.coverUrl || null,
              coverAlt: values.coverAlt,
              content: values.content,
            });
            if (Object.keys(issues).length) {
              applyErrors(issues);
              toast.error("A few things are needed before publishing.");
              return;
            }
          }
          const res = post
            ? await updatePost(post.id, payload(values))
            : await createPost(payload(values));
          if (!res.ok) {
            setServerError(res.error);
            applyErrors(res.fieldErrors);
            toast.error(res.error);
            return;
          }
          reset(values);
          let message = res.message;
          if (mode === "publish") {
            const pub = await publishPost(res.data.id);
            if (!pub.ok) {
              toast.error(`Saved as a draft, but not published: ${pub.error}`);
              applyErrors(pub.fieldErrors);
              if (!post) router.replace(`/admin/posts/${res.data.id}`);
              return;
            }
            message = pub.message;
          }
          toast.success(message);
          if (!post) router.replace(`/admin/posts/${res.data.id}`);
          else router.refresh();
        }),
      (invalid) => {
        toast.error("Please check the highlighted fields.");
        const first = errorList(invalid)[0];
        if (first) focus(first.path);
      },
    )();

  const unpublish = () =>
    startTransition(async () => {
      if (!post) return;
      const res = await unpublishPost(post.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });

  // ---- inline "New category" ----
  const [newCat, setNewCat] = useState<{ open: boolean; name: string; error?: string }>({
    open: false,
    name: "",
  });
  const [catPending, startCat] = useTransition();
  const addCategory = () =>
    startCat(async () => {
      const res = await createCategory({ name: newCat.name });
      if (!res.ok) {
        setNewCat((c) => ({ ...c, error: res.fieldErrors?.name ?? res.error }));
        document.getElementById(fid("newCategory"))?.focus();
        return;
      }
      setCategories((list) =>
        [...list, { id: res.data.id, name: res.data.name }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      // Selected in an effect: the <select> can only take the value once its <option> exists.
      setSelectCategory(res.data.id);
      setNewCat({ open: false, name: "" });
      toast.success(res.message);
    });
  const [selectCategory, setSelectCategory] = useState<string | null>(null);
  useEffect(() => {
    if (!selectCategory || !categories.some((c) => c.id === selectCategory)) return;
    setValue("categoryId", selectCategory, { shouldDirty: true });
    clearErrors("categoryId");
    document.getElementById(fieldId("categoryId", scope))?.focus();
    setSelectCategory(null);
  }, [selectCategory, categories, setValue, clearErrors, scope]);

  const list = submitCount > 0 || serverError ? errorList(errors) : [];
  const excerptLen = excerpt.length;
  const serpTitle = `${(v.seoTitle ?? "").trim() || title.trim() || "Post title"} — Verity Homes and Properties`;
  const serpDesc = postMetaDescription({
    seoDescription: v.seoDescription ?? "",
    excerpt,
    title: title || "Post title",
  });
  const coverError = err("cover") ?? err("coverUrl");

  return (
    <IdScope.Provider value={scope}>
      <form
        className={editorStyles.editor}
        aria-label="Post editor"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(published ? "save" : "draft");
        }}
      >
        <div className={editorStyles.mainCol}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-post`}>
            <h2 id={`${scope}sec-post`}>Post</h2>
            <div className={editorStyles.fields}>
              <Field path="title" label="Title" error={err("title")} full>
                <input
                  {...register("title")}
                  {...cp("title", err("title"))}
                  maxLength={POST_LIMITS.title}
                  placeholder="e.g. What a C of O really means"
                />
              </Field>
              <Field
                path="slug"
                label="Web address"
                hint={
                  published
                    ? "Changing it after publishing adds a redirect from the old address."
                    : "Created from the title. Lowercase letters, numbers and hyphens."
                }
                error={err("slug")}
                full
              >
                <div
                  className={editorStyles.prefix}
                  data-invalid={err("slug") ? "true" : undefined}
                >
                  <span aria-hidden="true">/blog/</span>
                  <input
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                    {...cp("slug", err("slug"), true)}
                    maxLength={POST_LIMITS.slug}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </Field>
              <div className={editorStyles.f}>
                <label htmlFor={fid("categoryId")}>Category</label>
                <select {...register("categoryId")} {...cp("categoryId", err("categoryId"))}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {err("categoryId") ? (
                  <span id={`${fid("categoryId")}-err`} className={editorStyles.err}>
                    {err("categoryId")}
                  </span>
                ) : null}
                {newCat.open ? (
                  <div className={styles.newCat}>
                    <label className="sr-only" htmlFor={fid("newCategory")}>
                      New category name
                    </label>
                    <input
                      id={fid("newCategory")}
                      className={editorStyles.control}
                      value={newCat.name}
                      maxLength={POST_LIMITS.category}
                      placeholder="New category name"
                      aria-invalid={newCat.error ? true : undefined}
                      aria-describedby={newCat.error ? `${fid("newCategory")}-err` : undefined}
                      autoFocus
                      onChange={(e) => setNewCat({ open: true, name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault(); // never submits the post
                          addCategory();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setNewCat({ open: false, name: "" });
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.navy}`}
                      onClick={addCategory}
                      disabled={catPending}
                    >
                      {catPending ? "Adding…" : "Add"}
                    </button>
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.ghost}`}
                      onClick={() => setNewCat({ open: false, name: "" })}
                    >
                      Cancel
                    </button>
                    {newCat.error ? (
                      <span
                        id={`${fid("newCategory")}-err`}
                        className={editorStyles.err}
                        style={{ flexBasis: "100%" }}
                      >
                        {newCat.error}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setNewCat({ open: true, name: "" })}
                  >
                    + New category
                  </button>
                )}
              </div>
              <Field path="authorName" label="Author" error={err("authorName")}>
                <input
                  {...register("authorName")}
                  {...cp("authorName", err("authorName"))}
                  maxLength={POST_LIMITS.author}
                />
              </Field>
              <Field
                path="excerpt"
                label="Excerpt"
                hint={
                  <>
                    Shown on the blog list and the home page, and used by Google if there&apos;s no
                    SEO description.{" "}
                    <span
                      className={`${styles.counter} ${excerptLen > POST_LIMITS.excerptRecommended ? styles.over : ""}`}
                      data-testid="excerpt-counter"
                    >
                      {excerptLen} / {POST_LIMITS.excerptRecommended} recommended
                      {excerptLen > POST_LIMITS.excerptRecommended
                        ? " — Google may cut it short"
                        : ""}
                    </span>
                  </>
                }
                error={err("excerpt")}
                full
              >
                <textarea
                  className={editorStyles.short}
                  {...register("excerpt")}
                  {...cp("excerpt", err("excerpt"), true)}
                  maxLength={POST_LIMITS.excerpt}
                />
              </Field>
            </div>
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-cover`}>
            <h2 id={`${scope}sec-cover`}>
              Cover image
              <span className={ui.panelNote}>Needed to publish</span>
            </h2>
            <CoverField
              id={fid("cover")}
              postId={post?.id ?? null}
              uploadPrefix={uploadPrefix}
              coverUrl={v.coverUrl ?? ""}
              error={coverError}
              onChange={(img) => {
                setValue("coverUrl", img?.url ?? "", { shouldDirty: true });
                setValue("coverPathname", img?.pathname ?? "", { shouldDirty: true });
                clearErrors(["cover", "coverUrl"] as Path<PostFormValues>[]);
              }}
            />
            {post && v.coverUrl ? (
              <div className={editorStyles.fields}>
                <Field
                  path="coverAlt"
                  label="Cover alt text"
                  hint="Describe the photo for people who can't see it. Required before publishing."
                  error={err("coverAlt")}
                  full
                >
                  <input
                    {...register("coverAlt")}
                    {...cp("coverAlt", err("coverAlt"), true)}
                    maxLength={POST_LIMITS.coverAlt}
                    placeholder="e.g. A finished duplex in Lekki at dusk"
                  />
                </Field>
              </div>
            ) : null}
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-body`}>
            <h2 id={`${scope}sec-body`}>Article</h2>
            <BodyField
              id={fid("content")}
              value={content}
              register={register("content")}
              aria={cp("content", err("content"))}
              onChange={(next) =>
                setValue("content", next, { shouldDirty: true, shouldValidate: submitCount > 0 })
              }
              tab={tab}
              onTab={setTab}
              postId={post?.id ?? null}
              uploadPrefix={uploadPrefix}
              siteUrl={siteUrl}
              error={err("content")}
            />
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-seo`}>
            <h2 id={`${scope}sec-seo`}>Google preview</h2>
            <div className={editorStyles.serp} aria-label="How this may look in Google">
              <div className={editorStyles.serpUrl}>
                {siteHost} › blog › {v.slug || "web-address"}
              </div>
              <div className={editorStyles.serpTitle}>{serpTitle}</div>
              <div className={editorStyles.serpDesc}>{serpDesc}</div>
            </div>
            <div className={editorStyles.fields}>
              <Field
                path="seoTitle"
                label="SEO title"
                hint={`Optional. Up to ${POST_LIMITS.seoTitle} characters; the title is used if empty.`}
                error={err("seoTitle")}
              >
                <input
                  {...register("seoTitle")}
                  {...cp("seoTitle", err("seoTitle"), true)}
                  maxLength={POST_LIMITS.seoTitle}
                />
              </Field>
              <Field
                path="seoDescription"
                label="SEO description"
                hint={`Optional. Up to ${POST_LIMITS.seoDescription} characters; the excerpt is used if empty.`}
                error={err("seoDescription")}
              >
                <textarea
                  className={editorStyles.short}
                  {...register("seoDescription")}
                  {...cp("seoDescription", err("seoDescription"), true)}
                  maxLength={POST_LIMITS.seoDescription}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className={editorStyles.aside}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-publish`}>
            <h2 id={`${scope}sec-publish`}>Publish</h2>
            <div className={editorStyles.status}>
              <span>
                Status
                <small>
                  {published ? "Live on the blog and the home page" : "Draft — not on the website"}
                </small>
              </span>
              <span className={`${ui.badge} ${published ? ui.pub : ui.draft}`}>
                {published ? "Published" : "Draft"}
              </span>
            </div>
            <div className={editorStyles.savebar}>
              {published ? (
                <>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.ghost}`}
                    onClick={unpublish}
                    disabled={pending}
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.navy}`}
                    onClick={() => void save("save")}
                    disabled={pending}
                  >
                    {pending ? "Saving…" : "Save changes"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.ghost}`}
                    onClick={() => void save("draft")}
                    disabled={pending}
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.navy}`}
                    onClick={() => void save("publish")}
                    disabled={pending}
                  >
                    {pending ? "Saving…" : "Publish"}
                  </button>
                </>
              )}
            </div>
            {list.length ? (
              <div className={`${ui.alert} ${ui.error} ${editorStyles.summary}`} role="alert">
                <div>
                  <b>{list.length === 1 ? "1 thing to fix" : `${list.length} things to fix`}</b>
                  <ul>
                    {list.map((e) => (
                      <li key={e.path}>
                        <a
                          href={`#${fid(e.path)}`}
                          onClick={(ev) => {
                            ev.preventDefault();
                            focus(e.path);
                          }}
                        >
                          {POST_FIELD_LABEL[e.path] ?? e.path}
                        </a>
                        : {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : serverError ? (
              <div className={`${ui.alert} ${ui.error} ${editorStyles.summary}`} role="alert">
                {serverError}
              </div>
            ) : null}
            <div className={editorStyles.metaList}>
              {post ? (
                <>
                  <span>
                    Created {formatDate(new Date(post.createdAt))} · Updated{" "}
                    {formatDate(new Date(post.updatedAt))}
                  </span>
                  {post.publishedAt ? (
                    <span>First published {formatDate(new Date(post.publishedAt))}</span>
                  ) : null}
                </>
              ) : (
                <span>
                  New post — saved as a draft until you publish it. Save it once to add images.
                </span>
              )}
              {published && post ? (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                  View on site ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </section>

          {post ? (
            <section className={ui.panel} aria-labelledby={`${scope}sec-danger`}>
              <h2 id={`${scope}sec-danger`}>Danger zone</h2>
              <DeleteButton
                id={post.id}
                title={getValues("title") || "this post"}
                what="post"
                action={deletePost}
                variant="panel"
                redirectTo="/admin/posts"
                onDeleted={() => reset(getValues())}
                body={POST_DELETE_BODY}
              />
            </section>
          ) : null}
        </div>
      </form>
    </IdScope.Provider>
  );
}
