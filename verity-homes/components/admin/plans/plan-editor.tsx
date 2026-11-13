"use client";

// Investment plan editor (Unit 17) for /admin/plans/new and /[id], in the property editor's
// pattern: React Hook Form + zodResolver(planSchema) (the same schema runs in the actions),
// the same field shell, price input, switches, panels and danger zone. The investment
// disclaimer is shown read-only at the top as a reminder.
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, type FieldErrors, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { createPlan, deletePlan, publishPlan, unpublishPlan, updatePlan } from "@/lib/actions/plan";
import { INVEST_DISCLAIMER } from "@/lib/invest";
import { PAYOUT_LABEL, formatDate } from "@/lib/format";
import { fieldId } from "@/lib/validation/property";
import {
  PAYOUT_FREQUENCIES,
  PLAN_FIELD_LABEL,
  PLAN_LIMITS,
  type PlanData,
  type PlanFormValues,
  planSchema,
} from "@/lib/validation/plan";
import { DeleteButton } from "../delete-button";
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

function errorList(errors: FieldErrors<PlanFormValues>) {
  return ORDER.flatMap((k) => {
    const m = (errors as Record<string, { message?: string } | undefined>)[k]?.message;
    return m ? [{ path: k, message: m }] : [];
  });
}

export type PlanEditorProps = {
  plan?: {
    id: string;
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
  const focus = (path: string) => {
    const el = document.getElementById(fid(path));
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const wantsHighlight = useWatch({ control, name: "highlighted" });
  const otherHighlighted = highlighted && highlighted.id !== plan?.id ? highlighted : null;

  const applyErrors = (fieldErrors?: Record<string, string>) => {
    if (!fieldErrors) return;
    for (const [k, m] of Object.entries(fieldErrors)) {
      setError(k as Path<PlanFormValues>, { type: "server", message: m });
    }
    const first = ORDER.find((k) => k in fieldErrors);
    if (first) requestAnimationFrame(() => focus(first));
  };

  const save = (mode: SaveMode) =>
    handleSubmit(
      () =>
        startTransition(async () => {
          setServerError(null);
          const values = getValues();
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

          <section className={ui.panel} aria-labelledby={`${scope}sec-terms`}>
            <h2 id={`${scope}sec-terms`}>Terms</h2>
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
                          {PLAN_FIELD_LABEL[e.path]}
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
              {published ? (
                <a href="/invest#plans-h" target="_blank" rel="noopener noreferrer">
                  View on /invest ↗<span className="sr-only"> (opens in a new tab)</span>
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
