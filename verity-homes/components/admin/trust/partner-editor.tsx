"use client";

// Partner editor (Unit 19b) for /admin/partners/new and /[id], in the plan/post editor pattern:
// React Hook Form + zodResolver(partnerSchema) (the same schema runs in the actions). Publishing
// is blocked until "We have permission to display this logo" is ticked — here, in the action and
// in the public query. The editor is not keyed on save, so it never remounts.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { type FieldErrors, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  createPartner,
  deletePartner,
  publishPartner,
  unpublishPartner,
  updatePartner,
} from "@/lib/actions/partner";
import { useHydrated } from "@/lib/use-hydrated";
import { fieldId } from "@/lib/validation/property";
import {
  CONSENT_PARTNER,
  TRUST_LIMITS,
  type PartnerData,
  type PartnerFormValues,
  partnerSchema,
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
  name: "Partner name",
  website: "Website",
  logoUrl: "Logo",
  consentConfirmed: "Permission",
};
const ORDER = Object.keys(LABEL);

function errorList(errors: FieldErrors<PartnerFormValues>) {
  const e = errors as Record<string, { message?: string } | undefined>;
  return ORDER.flatMap((k) => (e[k]?.message ? [{ path: k, message: e[k]!.message! }] : []));
}

type Props = {
  partner?: { id: string; status: "DRAFT" | "PUBLISHED" };
  initialValues: PartnerFormValues;
  uploadPrefix: string;
};

export function PartnerEditor({ partner, initialValues, uploadPrefix }: Props) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const published = partner?.status === "PUBLISHED";
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
  } = useForm<PartnerFormValues, unknown, PartnerData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: initialValues,
    shouldFocusError: false,
  });
  useUnsavedChangesWarning(isDirty && !pending);
  const err = (k: string) =>
    (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const v = useWatch({ control }) as PartnerFormValues;

  const focus = (path: string) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(fid(path === "logoUrl" ? "logo" : path));
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const applyErrors = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    for (const [k, m] of Object.entries(fieldErrors))
      setError(k as Path<PartnerFormValues>, { type: "server", message: m });
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
            applyErrors({ consentConfirmed: CONSENT_PARTNER });
            toast.error(`Publishing is blocked: ${CONSENT_PARTNER}`);
            return;
          }
          const res = partner
            ? await updatePartner(partner.id, values)
            : await createPartner(values);
          if (!res.ok) {
            setServerError(res.error);
            applyErrors(res.fieldErrors);
            toast.error(res.error);
            return;
          }
          reset(values);
          let message = res.message;
          if (mode === "publish") {
            const pub = await publishPartner(res.data.id);
            if (!pub.ok) {
              setServerError(pub.error);
              applyErrors(pub.fieldErrors);
              toast.error(`Saved as a draft, but not published: ${pub.error}`);
              if (!partner) router.replace(`/admin/partners/${res.data.id}`);
              else router.refresh();
              return;
            }
            message = pub.message;
          }
          toast.success(message);
          if (!partner) router.replace(`/admin/partners/${res.data.id}`);
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
      if (!partner) return;
      const res = await unpublishPartner(partner.id);
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
        aria-label="Partner editor"
        data-ready={hydrated ? "true" : undefined}
        data-version={partner?.id}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(published ? "save" : "draft");
        }}
      >
        <div className={editor.mainCol}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-p`}>
            <h2 id={`${scope}sec-p`}>Partner</h2>
            <div className={editor.fields}>
              <Field
                path="name"
                label="Partner name"
                hint="Also the logo's alt text."
                error={err("name")}
              >
                <input
                  {...register("name")}
                  {...cp("name", err("name"), true)}
                  maxLength={TRUST_LIMITS.name}
                />
              </Field>
              <Field
                path="website"
                label="Website (optional)"
                hint="Full https:// address. The logo links there in a new tab."
                error={err("website")}
              >
                <input
                  {...register("website")}
                  {...cp("website", err("website"), true)}
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={TRUST_LIMITS.website}
                  placeholder="https://"
                />
              </Field>
            </div>
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-logo`}>
            <h2 id={`${scope}sec-logo`}>
              Logo
              <span className={ui.panelNote}>Shown in grey, in colour on hover</span>
            </h2>
            <TrustImageField
              kind="partners"
              noun="logo"
              id={fid("logo")}
              recordId={partner?.id ?? null}
              uploadPrefix={uploadPrefix}
              url={v.logoUrl ?? ""}
              error={err("logoUrl")}
              onChange={(img) => {
                setValue("logoUrl", img?.url ?? "", { shouldDirty: true });
                setValue("logoPathname", img?.pathname ?? "", { shouldDirty: true });
                clearErrors("logoUrl");
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
                <b>We have permission to display this logo</b>
                <small id={`${fid("consentConfirmed")}-hint`}>
                  Needed to publish. Unticking it on a published partner takes it off the site when
                  you save.
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
                <small>
                  {published ? "On the home page and /about" : "Draft — not on the website"}
                </small>
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
                {partner
                  ? "Shown in the partner strip on the home page and /about while published."
                  : "New partner — saved as a draft until you publish it. Save it once to add a logo."}
              </span>
            </div>
          </section>

          {partner ? (
            <section className={ui.panel} aria-labelledby={`${scope}sec-danger`}>
              <h2 id={`${scope}sec-danger`}>Danger zone</h2>
              <DeleteButton
                id={partner.id}
                title={getValues("name") || "this partner"}
                what="partner"
                action={deletePartner}
                variant="panel"
                redirectTo="/admin/partners"
                onDeleted={() => reset(getValues())}
                body="It disappears from the partner strip, with its logo. This can't be undone."
              />
            </section>
          ) : null}
        </div>
      </form>
    </IdScope.Provider>
  );
}
