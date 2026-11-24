"use client";

// Testimonial editor (Unit 19b) for /admin/testimonials/new and /[id], in the plan/post editor
// pattern: React Hook Form + zodResolver(testimonialSchema) (the same schema runs in the
// actions), the shared field shell, publish panel, error summary and danger zone. Publishing is
// blocked until "The client gave written permission to publish this" is ticked — here, in the
// action and in the public query. The editor is not keyed on save, so it never remounts.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { type FieldErrors, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createTestimonial,
  deleteTestimonial,
  publishTestimonial,
  unpublishTestimonial,
  updateTestimonial,
} from "@/lib/actions/testimonial";
import { useHydrated } from "@/lib/use-hydrated";
import { fieldId } from "@/lib/validation/property";
import {
  CONSENT_TESTIMONIAL,
  TRUST_LIMITS,
  type TestimonialData,
  type TestimonialFormValues,
  testimonialSchema,
} from "@/lib/validation/trust";
import { DeleteButton } from "../delete-button";
import {
  Field,
  IdScope,
  controlProps,
  useUnsavedChangesWarning,
} from "../properties/editor-inputs";
import editor from "../properties/editor.module.css";
import ui from "../ui.module.css";
import { TrustImageField } from "./image-field";
import styles from "./trust.module.css";

const LABEL: Record<string, string> = {
  name: "Client's name",
  serviceUsed: "Service used",
  quote: "Quote",
  rating: "Rating",
  avatarUrl: "Photo",
  consentConfirmed: "Permission",
};
const ORDER = Object.keys(LABEL);

function errorList(errors: FieldErrors<TestimonialFormValues>) {
  const e = errors as Record<string, { message?: string } | undefined>;
  return ORDER.flatMap((k) => (e[k]?.message ? [{ path: k, message: e[k]!.message! }] : []));
}

type Props = {
  testimonial?: { id: string; status: "DRAFT" | "PUBLISHED" };
  initialValues: TestimonialFormValues;
  uploadPrefix: string;
};

export function TestimonialEditor({ testimonial, initialValues, uploadPrefix }: Props) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  // The first save on /new navigates to /admin/testimonials/[id], which mounts a new editor: the form
  // is locked (inert, aria-busy) until then so no edit lands on this one (Unit 20b).
  const [handingOff, setHandingOff] = useState(false);
  const published = testimonial?.status === "PUBLISHED";
  const scope = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-`;
  const fid = (p: string) => fieldId(p, scope);
  const cp = (p: string, e?: string, hint?: boolean) => controlProps(scope, p, e, hint);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty, submitCount },
  } = useForm<TestimonialFormValues, unknown, TestimonialData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: initialValues,
    shouldFocusError: false,
  });
  useUnsavedChangesWarning(isDirty && !pending);
  const err = (k: string) =>
    (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const v = useWatch({ control }) as TestimonialFormValues;
  const quoteLen = (v.quote ?? "").length;

  const focus = (path: string) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(fid(path === "avatarUrl" ? "avatar" : path));
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const applyErrors = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    for (const [k, m] of Object.entries(fieldErrors))
      setError(k as Path<TestimonialFormValues>, { type: "server", message: m });
    const first = ORDER.find((k) => k in fieldErrors);
    if (first) focus(first);
  };

  const save = (mode: "draft" | "publish" | "save") =>
    handleSubmit(
      () =>
        startTransition(async () => {
          setServerError(null);
          const values = getValues();
          if (mode === "publish" && !values.consentConfirmed) {
            applyErrors({ consentConfirmed: CONSENT_TESTIMONIAL });
            toast.error(`Publishing is blocked: ${CONSENT_TESTIMONIAL}`);
            return;
          }
          const res = testimonial
            ? await updateTestimonial(testimonial.id, values)
            : await createTestimonial(values);
          if (!res.ok) {
            setServerError(res.error);
            applyErrors(res.fieldErrors);
            toast.error(res.error);
            return;
          }
          reset(values);
          let message = res.message;
          if (mode === "publish") {
            const pub = await publishTestimonial(res.data.id);
            if (!pub.ok) {
              setServerError(pub.error);
              applyErrors(pub.fieldErrors);
              toast.error(`Saved as a draft, but not published: ${pub.error}`);
              if (!testimonial) {
                setHandingOff(true);
                router.replace(`/admin/testimonials/${res.data.id}`);
              } else router.refresh();
              return;
            }
            message = pub.message;
          }
          toast.success(message);
          if (!testimonial) {
            setHandingOff(true);
            router.replace(`/admin/testimonials/${res.data.id}`);
          } else router.refresh();
        }),
      (invalid) => {
        toast.error("Please check the highlighted fields.");
        const first = errorList(invalid)[0];
        if (first) focus(first.path);
      },
    )();

  const unpublish = () =>
    startTransition(async () => {
      if (!testimonial) return;
      const res = await unpublishTestimonial(testimonial.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });

  const list = submitCount > 0 || serverError ? errorList(errors) : [];

  return (
    <IdScope.Provider value={scope}>
      <form
        className={editor.editor}
        aria-label="Testimonial editor"
        data-ready={hydrated ? "true" : undefined}
        data-version={testimonial?.id}
        aria-busy={pending || handingOff || undefined}
        inert={handingOff}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(published ? "save" : "draft");
        }}
      >
        <div className={editor.mainCol}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-t`}>
            <h2 id={`${scope}sec-t`}>Testimonial</h2>
            <div className={editor.fields}>
              <Field path="name" label="Client's name" error={err("name")}>
                <input
                  {...register("name")}
                  {...cp("name", err("name"))}
                  maxLength={TRUST_LIMITS.name}
                  placeholder="e.g. Adaeze O."
                />
              </Field>
              <Field
                path="serviceUsed"
                label="Service used"
                hint="Shown under the name, e.g. Home buyer, Tenant, Investment plan client."
                error={err("serviceUsed")}
              >
                <input
                  {...register("serviceUsed")}
                  {...cp("serviceUsed", err("serviceUsed"), true)}
                  maxLength={TRUST_LIMITS.serviceUsed}
                  placeholder="e.g. Home buyer"
                />
              </Field>
              <Field
                path="quote"
                label="Quote"
                hint={
                  <>
                    Their words, as they gave permission to share them.{" "}
                    <span
                      className={`${styles.counter} ${quoteLen > TRUST_LIMITS.quote ? styles.over : ""}`}
                      data-testid="quote-counter"
                    >
                      {quoteLen} / {TRUST_LIMITS.quote}
                    </span>
                  </>
                }
                error={err("quote")}
                full
              >
                <textarea
                  className={editor.short}
                  {...register("quote")}
                  {...cp("quote", err("quote"), true)}
                  maxLength={TRUST_LIMITS.quote}
                />
              </Field>
              <Field
                path="rating"
                label="Rating (optional)"
                hint="Stars on the card; leave empty for none."
                error={err("rating")}
              >
                <select {...register("rating")} {...cp("rating", err("rating"), true)}>
                  <option value="">No rating</option>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={String(n)}>
                      {"★".repeat(n)} ({n})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-photo`}>
            <h2 id={`${scope}sec-photo`}>
              Photo
              <span className={ui.panelNote}>
                Optional · shown with the client&apos;s name as alt text
              </span>
            </h2>
            <TrustImageField
              kind="testimonials"
              noun="photo"
              id={fid("avatar")}
              recordId={testimonial?.id ?? null}
              uploadPrefix={uploadPrefix}
              url={v.avatarUrl ?? ""}
              error={err("avatarUrl")}
              onChange={(img) => {
                setValue("avatarUrl", img?.url ?? "", { shouldDirty: true });
                setValue("avatarPathname", img?.pathname ?? "", { shouldDirty: true });
                clearErrors("avatarUrl");
              }}
            />
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-consent`}>
            <h2 id={`${scope}sec-consent`}>Permission</h2>
            <label className={styles.consent}>
              <input
                type="checkbox"
                {...register("consentConfirmed", {
                  onChange: () => clearErrors("consentConfirmed"),
                })}
                {...cp("consentConfirmed", err("consentConfirmed"), true)}
              />
              <span>
                <b>The client gave written permission to publish this</b>
                <small id={`${fid("consentConfirmed")}-hint`}>
                  Needed to publish. Unticking it on a published testimonial takes it off the site
                  when you save.
                </small>
              </span>
            </label>
            {err("consentConfirmed") ? (
              <p
                className={editor.err}
                id={`${fid("consentConfirmed")}-err`}
                data-testid="consent-error"
              >
                {err("consentConfirmed")}
              </p>
            ) : null}
          </section>
        </div>

        <div className={editor.aside}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-publish`}>
            <h2 id={`${scope}sec-publish`}>Publish</h2>
            <div className={editor.status}>
              <span>
                Status
                <small>{published ? "On the home page" : "Draft — not on the website"}</small>
              </span>
              <span className={`${ui.badge} ${published ? ui.pub : ui.draft}`}>
                {published ? "Published" : "Draft"}
              </span>
            </div>
            <div className={editor.savebar}>
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
              <div className={`${ui.alert} ${ui.error} ${editor.summary}`} role="alert">
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
                          {LABEL[e.path] ?? e.path}
                        </a>
                        : {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : serverError ? (
              <div className={`${ui.alert} ${ui.error} ${editor.summary}`} role="alert">
                {serverError}
              </div>
            ) : null}
            <div className={editor.metaList}>
              <span>
                {testimonial
                  ? "Shown in the home page testimonials while published."
                  : "New testimonial — saved as a draft until you publish it. Save it once to add a photo."}
              </span>
            </div>
          </section>

          {testimonial ? (
            <section className={ui.panel} aria-labelledby={`${scope}sec-danger`}>
              <h2 id={`${scope}sec-danger`}>Danger zone</h2>
              <DeleteButton
                id={testimonial.id}
                title={getValues("name") || "this testimonial"}
                what="testimonial"
                action={deleteTestimonial}
                variant="panel"
                redirectTo="/admin/testimonials"
                onDeleted={() => reset(getValues())}
                body="It disappears from the home page, with its photo. This can't be undone."
              />
            </section>
          ) : null}
        </div>
      </form>
    </IdScope.Provider>
  );
}
