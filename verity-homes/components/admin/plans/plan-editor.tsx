"use client";

// Investment plan editor (Unit 17) for /admin/plans/new and /[id], in the property editor's
// pattern: React Hook Form + zodResolver(planSchema) (the same schema runs in the actions),
// the same field shell, price input, switches, panels and danger zone. The investment
// disclaimer is shown read-only at the top as a reminder.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import {
  Controller,
  type FieldErrors,
  type Path,
  get,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { createPlan, deletePlan, publishPlan, unpublishPlan, updatePlan } from "@/lib/actions/plan";
import { INVEST_DISCLAIMER, annualisedPercent, formatPercent } from "@/lib/invest";
import { slugify } from "@/lib/slug";
import { PAYOUT_LABEL, formatDate, formatNaira, koboFromNaira } from "@/lib/format";
import { fieldId } from "@/lib/validation/property";
import {
  PAYOUT_FREQUENCIES,
  PLAN_FIELD_LABEL,
  PLAN_LIMITS,
  type PlanData,
  type PlanFormValues,
  planPublishIssues,
  planSchema,
} from "@/lib/validation/plan";
import { DeleteButton } from "../delete-button";
import { AdminIcon } from "../icons";
import {
  Field,
  IdScope,
  PriceInput,
  Switch,
  controlProps,
  useUnsavedChangesWarning,
} from "../properties/editor-inputs";
import styles from "../properties/editor.module.css";
import ui from "../ui.module.css";

const ORDER = Object.keys(PLAN_FIELD_LABEL);

const PACKAGE_SUB: Record<string, string> = {
  amount: "invest",
  receive: "receive",
  tenureMonths: "tenure",
  label: "name",
};

/** Top-level errors in form order, plus each package row's (Unit 17c). */
function errorList(errors: FieldErrors<PlanFormValues>) {
  const e = errors as Record<string, unknown>;
  return ORDER.flatMap((k) => {
    const node = e[k] as { message?: string } | Record<string, { message?: string }>[] | undefined;
    if (k === "packages" && Array.isArray(node)) {
      return node.flatMap((row, i) =>
        Object.entries(row ?? {}).flatMap(([sub, v]) =>
          v?.message ? [{ path: `packages.${i}.${sub}`, message: v.message }] : [],
        ),
      );
    }
    const m = (node as { message?: string } | undefined)?.message;
    return m ? [{ path: k, message: m }] : [];
  });
}

function errorLabel(path: string): string {
  const [top, i, sub] = path.split(".");
  if (top === "packages" && i !== undefined)
    return `Package ${Number(i) + 1}${sub ? ` (${PACKAGE_SUB[sub] ?? sub})` : ""}`;
  return PLAN_FIELD_LABEL[path] ?? path;
}

/** Live preview for a package row: gain and % per year, or null while the inputs are incomplete. */
function packagePreview(amount: string, receive: string, tenure: string) {
  try {
    const a = koboFromNaira(amount);
    const r = koboFromNaira(receive);
    const t = Number(tenure);
    if (a <= 0n || r <= a || !(t >= 1 && t <= 120)) return null;
    const pct = annualisedPercent({ amountKobo: a, returnAmountKobo: r, tenureMonths: t });
    return { gain: formatNaira(r - a), pct: pct === null ? "—" : formatPercent(pct) };
  } catch {
    return null;
  }
}

export type PlanEditorProps = {
  plan?: {
    id: string;
    slug: string | null;
    status: "DRAFT" | "PUBLISHED";
    createdAt: string;
    updatedAt: string;
    enquiryCount: number;
  };
  initialValues: PlanFormValues;
  /** The plan that has the gold card now (for the note), if any. */
  highlighted: { id: string; name: string } | null;
};

type SaveMode = "draft" | "publish" | "save";

export function PlanEditor({ plan, initialValues, highlighted }: PlanEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const published = plan?.status === "PUBLISHED";
  const scope = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-`;
  const fid = (p: string) => fieldId(p, scope);
  const cp = (p: string, e?: string, hint?: boolean) => controlProps(scope, p, e, hint);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    setValue,
    reset,
    formState: { errors, isDirty, submitCount },
  } = useForm<PlanFormValues, unknown, PlanData>({
    resolver: zodResolver(planSchema),
    defaultValues: initialValues,
    shouldFocusError: true,
  });
  useUnsavedChangesWarning(isDirty && !pending);
  const err = (k: string) =>
    (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  /** Nested error message ("packages.0.receive"). */
  const err2 = (path: string): string | undefined =>
    (get(errors, path) as { message?: string } | undefined)?.message;
  const focus = (path: string) => {
    const el = document.getElementById(fid(path));
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const wantsHighlight = useWatch({ control, name: "highlighted" });
  const packages = useFieldArray({ control, name: "packages", keyName: "key" });
  const watchedPackages = useWatch({ control, name: "packages" }) ?? [];
  const hasPackages = watchedPackages.length > 0;
  // New plan: the web address follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(plan));
  const name = useWatch({ control, name: "name" }) ?? "";
  useEffect(() => {
    if (!slugTouched)
      setValue("slug", slugify(name).slice(0, PLAN_LIMITS.slug), { shouldDirty: true });
  }, [name, slugTouched, setValue]);
  const otherHighlighted = highlighted && highlighted.id !== plan?.id ? highlighted : null;

  const applyErrors = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    for (const [k, m] of Object.entries(fieldErrors)) {
      setError(k as Path<PlanFormValues>, { type: "server", message: m });
    }
    const first = ORDER.find((k) => k in fieldErrors) ?? Object.keys(fieldErrors)[0];
    if (first) requestAnimationFrame(() => focus(first));
  };

  const save = (mode: SaveMode) =>
    handleSubmit(
      () =>
        startTransition(async () => {
          setServerError(null);
          const values = getValues();
          if (mode === "publish") {
            const issues = planPublishIssues({
              packageCount: (values.packages ?? []).length,
              slug: values.slug ?? "",
              contractWith: values.contractWith ?? "",
              payoutTerms: values.payoutTerms ?? "",
            });
            if (Object.keys(issues).length) {
              applyErrors(issues);
              toast.error("A few things are needed before publishing.");
              return;
            }
          }
          const res = plan ? await updatePlan(plan.id, values) : await createPlan(values);
          if (!res.ok) {
            setServerError(res.error);
            applyErrors(res.fieldErrors);
            toast.error(res.error);
            return;
          }
          reset(values);
          let message = res.message;
          if (mode === "publish") {
            const pub = await publishPlan(res.data.id);
            if (!pub.ok) {
              toast.error(`Saved as a draft, but not published: ${pub.error}`);
              applyErrors(pub.fieldErrors);
              if (!plan) router.replace(`/admin/plans/${res.data.id}`);
              return;
            }
            message = pub.message;
          }
          toast.success(message);
          if (!plan) router.replace(`/admin/plans/${res.data.id}`);
          else router.refresh();
        }),
      (invalid) => {
        toast.error("Please check the highlighted fields.");
        const first = errorList(invalid)[0];
        if (first) requestAnimationFrame(() => focus(first.path));
      },
    )();

  const unpublish = () =>
    startTransition(async () => {
      if (!plan) return;
      const res = await unpublishPlan(plan.id);
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
        className={styles.editor}
        aria-label="Plan editor"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(published ? "save" : "draft");
        }}
      >
        <div className={styles.mainCol}>
          <div className={`${ui.alert} ${ui.warn}`} role="note" data-testid="plan-disclaimer">
            <div>
              <b>Reminder — shown under the plans on /invest:</b> {INVEST_DISCLAIMER}
            </div>
          </div>

          <section className={ui.panel} aria-labelledby={`${scope}sec-plan`}>
            <h2 id={`${scope}sec-plan`}>Plan</h2>
            <div className={styles.fields}>
              <Field path="name" label="Plan name" error={err("name")} full>
                <input
                  {...register("name")}
                  {...cp("name", err("name"))}
                  maxLength={PLAN_LIMITS.name}
                  placeholder="e.g. Starter"
                />
              </Field>
              <Field
                path="badge"
                label="Badge"
                hint="Optional small label on the card, e.g. “Most popular”."
                error={err("badge")}
              >
                <input
                  {...register("badge")}
                  {...cp("badge", err("badge"), true)}
                  maxLength={PLAN_LIMITS.badge}
                />
              </Field>
              <Field path="payoutFrequency" label="Payout" error={err("payoutFrequency")}>
                <select
                  {...register("payoutFrequency")}
                  {...cp("payoutFrequency", err("payoutFrequency"))}
                >
                  {PAYOUT_FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {PAYOUT_LABEL[f]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                path="summary"
                label="Summary"
                hint="One or two sentences on who the plan suits. Avoid promising returns."
                error={err("summary")}
                full
              >
                <textarea
                  className={styles.short}
                  {...register("summary")}
                  {...cp("summary", err("summary"), true)}
                  maxLength={PLAN_LIMITS.summary}
                />
              </Field>
            </div>
          </section>

          {/* ---- Plan page /invest/<slug> (Unit 17c) ---- */}
          <section className={ui.panel} aria-labelledby={`${scope}sec-page`}>
            <h2 id={`${scope}sec-page`}>Plan page</h2>
            <div className={styles.fields}>
              <Field
                path="slug"
                label="Web address"
                hint={
                  published
                    ? "Changing it after publishing adds a redirect from the old address."
                    : "Created from the name. Lowercase letters, numbers and hyphens."
                }
                error={err("slug")}
                full
              >
                <div className={styles.prefix} data-invalid={err("slug") ? "true" : undefined}>
                  <span aria-hidden="true">/invest/</span>
                  <input
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                    {...cp("slug", err("slug"), true)}
                    maxLength={PLAN_LIMITS.slug}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </Field>
              <Field
                path="partnerName"
                label="Partner"
                hint="Shown as “In partnership with …”. Optional."
                error={err("partnerName")}
              >
                <input
                  {...register("partnerName")}
                  {...cp("partnerName", err("partnerName"), true)}
                  maxLength={PLAN_LIMITS.partner}
                />
              </Field>
              <Field
                path="contractWith"
                label="Agreement with"
                hint="Who the investor signs with, e.g. “Verity Homes and Properties Ltd”. Needed to publish."
                error={err("contractWith")}
              >
                <input
                  {...register("contractWith")}
                  {...cp("contractWith", err("contractWith"), true)}
                  maxLength={PLAN_LIMITS.partner}
                />
              </Field>
              <Field
                path="description"
                label="Description"
                hint="Markdown: **bold**, lists, links. Describe the project; avoid promising returns."
                error={err("description")}
                full
              >
                <textarea
                  {...register("description")}
                  {...cp("description", err("description"), true)}
                  maxLength={PLAN_LIMITS.description}
                />
              </Field>
              <Field
                path="payoutTerms"
                label="Payout terms"
                hint="When and how returns are paid, per the agreement. Needed to publish."
                error={err("payoutTerms")}
                full
              >
                <textarea
                  className={styles.short}
                  {...register("payoutTerms")}
                  {...cp("payoutTerms", err("payoutTerms"), true)}
                  maxLength={PLAN_LIMITS.terms}
                />
              </Field>
              <Field
                path="exitTerms"
                label="Exit terms"
                hint="Early exit, and what happens at maturity. Optional."
                error={err("exitTerms")}
                full
              >
                <textarea
                  className={styles.short}
                  {...register("exitTerms")}
                  {...cp("exitTerms", err("exitTerms"), true)}
                  maxLength={PLAN_LIMITS.terms}
                />
              </Field>
            </div>
          </section>

          {/* ---- Packages (Unit 17c) ---- */}
          <section
            className={ui.panel}
            aria-labelledby={`${scope}sec-packages`}
            data-testid="plan-packages"
          >
            <h2 id={`${scope}sec-packages`}>
              Packages
              <span className={ui.panelNote}>Invest an amount → expected amount at maturity</span>
            </h2>
            <div className={styles.rows}>
              {packages.fields.length === 0 ? (
                <p className={styles.emptyRows}>
                  No packages yet. A plan needs at least one to be published.
                </p>
              ) : null}
              {packages.fields.map((row, i) => {
                const w = watchedPackages[i];
                const preview = w
                  ? packagePreview(w.amount ?? "", w.receive ?? "", w.tenureMonths ?? "")
                  : null;
                return (
                  <fieldset key={row.key} className={styles.plotRow} data-package-index={i}>
                    <legend>Package {i + 1}</legend>
                    <div className={`${styles.fields} ${styles.three}`}>
                      <Field
                        path={`packages.${i}.amount`}
                        label="Invest"
                        error={err2(`packages.${i}.amount`)}
                      >
                        <div
                          className={styles.prefix}
                          data-invalid={err2(`packages.${i}.amount`) ? "true" : undefined}
                        >
                          <span aria-hidden="true">₦</span>
                          <Controller
                            control={control}
                            name={`packages.${i}.amount`}
                            render={({ field }) => (
                              <PriceInput
                                name={field.name}
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                inputRef={field.ref}
                                placeholder="e.g. 10,000,000"
                                {...cp(`packages.${i}.amount`, err2(`packages.${i}.amount`))}
                              />
                            )}
                          />
                        </div>
                      </Field>
                      <Field
                        path={`packages.${i}.receive`}
                        label="Receive (expected)"
                        error={err2(`packages.${i}.receive`)}
                      >
                        <div
                          className={styles.prefix}
                          data-invalid={err2(`packages.${i}.receive`) ? "true" : undefined}
                        >
                          <span aria-hidden="true">₦</span>
                          <Controller
                            control={control}
                            name={`packages.${i}.receive`}
                            render={({ field }) => (
                              <PriceInput
                                name={field.name}
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                inputRef={field.ref}
                                placeholder="e.g. 10,500,000"
                                {...cp(`packages.${i}.receive`, err2(`packages.${i}.receive`))}
                              />
                            )}
                          />
                        </div>
                      </Field>
                      <Field
                        path={`packages.${i}.tenureMonths`}
                        label="Tenure (months)"
                        error={err2(`packages.${i}.tenureMonths`)}
                      >
                        <input
                          type="number"
                          min={1}
                          max={120}
                          inputMode="numeric"
                          {...register(`packages.${i}.tenureMonths`)}
                          {...cp(`packages.${i}.tenureMonths`, err2(`packages.${i}.tenureMonths`))}
                        />
                      </Field>
                      <Field
                        path={`packages.${i}.label`}
                        label="Name (optional)"
                        error={err2(`packages.${i}.label`)}
                      >
                        <input
                          maxLength={PLAN_LIMITS.packageLabel}
                          placeholder="e.g. Starter"
                          {...register(`packages.${i}.label`)}
                          {...cp(`packages.${i}.label`, err2(`packages.${i}.label`))}
                        />
                      </Field>
                      <div className={styles.f}>
                        <span className={styles.lbl}>Preview</span>
                        <p
                          className={styles.hint}
                          data-testid={`package-preview-${i}`}
                          aria-live="polite"
                        >
                          {preview
                            ? `Gain ${preview.gain} · ${preview.pct} per year`
                            : "Enter invest, receive and tenure"}
                        </p>
                      </div>
                      <div className={styles.f}>
                        <span className={styles.lbl} aria-hidden="true">
                          &nbsp;
                        </span>
                        <div className={styles.plotOps}>
                          <button
                            type="button"
                            className={ui.iconBtn}
                            aria-label={`Move package ${i + 1} up`}
                            disabled={i === 0}
                            onClick={() => packages.move(i, i - 1)}
                          >
                            <AdminIcon name="up" />
                          </button>
                          <button
                            type="button"
                            className={ui.iconBtn}
                            aria-label={`Move package ${i + 1} down`}
                            disabled={i === packages.fields.length - 1}
                            onClick={() => packages.move(i, i + 1)}
                          >
                            <AdminIcon name="down" />
                          </button>
                          <button
                            type="button"
                            className={ui.iconBtn}
                            aria-label={`Remove package ${i + 1}`}
                            onClick={() => packages.remove(i)}
                          >
                            <AdminIcon name="x" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                );
              })}
              {packages.fields.length < PLAN_LIMITS.packages ? (
                <button
                  type="button"
                  id={fid("packages")}
                  aria-describedby={err("packages") ? `${fid("packages")}-err` : undefined}
                  className={`${ui.btn} ${ui.ghost} ${styles.addRow}`}
                  onClick={() =>
                    packages.append({ label: "", amount: "", receive: "", tenureMonths: "12" })
                  }
                >
                  <AdminIcon name="plus" />
                  Add a package
                </button>
              ) : null}
              {err("packages") ? (
                <span className={styles.err} id={`${fid("packages")}-err`}>
                  {err("packages")}
                </span>
              ) : null}
            </div>
          </section>

          <section className={ui.panel} aria-labelledby={`${scope}sec-terms`}>
            <h2 id={`${scope}sec-terms`}>Terms</h2>
            {hasPackages ? (
              <p
                className={styles.hint}
                data-testid="terms-from-packages"
                style={{ marginTop: -6 }}
              >
                This plan has packages, so the site shows “Invest from” the smallest package and the
                packages&apos; own returns. These older fields aren&apos;t used while packages
                exist.
              </p>
            ) : null}
            <div className={`${styles.fields} ${styles.three}`}>
              <Field path="minimum" label="Minimum investment" error={err("minimum")}>
                <div className={styles.prefix} data-invalid={err("minimum") ? "true" : undefined}>
                  <span aria-hidden="true">₦</span>
                  <Controller
                    control={control}
                    name="minimum"
                    render={({ field }) => (
                      <PriceInput
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        disabled={hasPackages}
                        {...cp("minimum", err("minimum"))}
                      />
                    )}
                  />
                </div>
              </Field>
              <Field
                path="returnRatePercent"
                label="Return rate (% a year)"
                hint="0 shows a placeholder on the site until the rate is approved."
                error={err("returnRatePercent")}
              >
                <div
                  className={styles.prefix}
                  data-invalid={err("returnRatePercent") ? "true" : undefined}
                >
                  <input
                    inputMode="decimal"
                    disabled={hasPackages}
                    {...register("returnRatePercent")}
                    {...cp("returnRatePercent", err("returnRatePercent"), true)}
                  />
                  <span aria-hidden="true">%</span>
                </div>
              </Field>
              <Field path="tenureMonths" label="Tenure (months)" error={err("tenureMonths")}>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  disabled={hasPackages}
                  {...register("tenureMonths")}
                  {...cp("tenureMonths", err("tenureMonths"))}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className={styles.aside}>
          <section className={ui.panel} aria-labelledby={`${scope}sec-publish`}>
            <h2 id={`${scope}sec-publish`}>Publish</h2>
            <div className={styles.status}>
              <span>
                Status
                <small>
                  {published ? "Live on /invest and the home page" : "Draft — not on the website"}
                </small>
              </span>
              <span className={`${ui.badge} ${published ? ui.pub : ui.draft}`}>
                {published ? "Published" : "Draft"}
              </span>
            </div>
            <Switch
              label="Highlighted"
              note="The gold card on /invest"
              id={fid("highlighted")}
              {...register("highlighted")}
            />
            <p className={styles.hint} data-testid="highlight-note">
              Only one plan can be highlighted.{" "}
              {otherHighlighted
                ? wantsHighlight
                  ? `Saving turns it off for “${otherHighlighted.name}”.`
                  : `Right now it's “${otherHighlighted.name}”.`
                : wantsHighlight
                  ? "This plan has it."
                  : "No plan has it right now."}
            </p>
            <div className={styles.savebar}>
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
              <div className={`${ui.alert} ${ui.error} ${styles.summary}`} role="alert">
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
                          {errorLabel(e.path)}
                        </a>
                        : {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : serverError ? (
              <div className={`${ui.alert} ${ui.error} ${styles.summary}`} role="alert">
                {serverError}
              </div>
            ) : null}
            <div className={styles.metaList}>
              {plan ? (
                <span>
                  Created {formatDate(new Date(plan.createdAt))} · Updated{" "}
                  {formatDate(new Date(plan.updatedAt))}
                </span>
              ) : (
                <span>New plan — saved as a draft until you publish it.</span>
              )}
              {published && plan?.slug ? (
                <a href={`/invest/${plan.slug}`} target="_blank" rel="noopener noreferrer">
                  View plan page ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </section>

          {plan ? (
            <section className={ui.panel} aria-labelledby={`${scope}sec-danger`}>
              <h2 id={`${scope}sec-danger`}>Danger zone</h2>
              <DeleteButton
                id={plan.id}
                title={getValues("name") || "this plan"}
                what="plan"
                action={deletePlan}
                variant="panel"
                redirectTo="/admin/plans"
                onDeleted={() => reset(getValues())}
                body={
                  <>
                    <p>It disappears from /invest and the home page. This can&apos;t be undone.</p>
                    <p>
                      {plan.enquiryCount === 0
                        ? "No enquiries mention this plan."
                        : `${plan.enquiryCount} ${plan.enquiryCount === 1 ? "enquiry mentions" : "enquiries mention"} this plan. They stay in your inbox (without the plan link).`}
                    </p>
                  </>
                }
              />
              <p className={styles.dangerNote}>
                {plan.enquiryCount
                  ? `Enquiries that mention it keep their history (${plan.enquiryCount}).`
                  : "No enquiries mention this plan."}
              </p>
            </section>
          ) : null}
        </div>
      </form>
    </IdScope.Provider>
  );
}
