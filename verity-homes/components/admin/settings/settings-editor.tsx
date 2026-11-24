"use client";

// /admin/settings (Unit 19a): one form in grouped panels (Contact, Office, Company, Social,
// Website text) with one Save button and the unsaved-changes warning, in the property/plan
// editor pattern: React Hook Form + zodResolver(settingsSchema) — the same schema runs in
// lib/actions/settings.ts. The Privacy panel has its own two buttons (not part of the form).
import { useHydrated } from "@/lib/use-hydrated";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { type FieldErrors, type Path, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { setPrivacyReviewed, updateSettings } from "@/lib/actions/settings";
import { formatDate } from "@/lib/format";
import { mapEmbedUrl } from "@/lib/maps";
import { fieldId } from "@/lib/validation/property";
import {
  SETTINGS_FIELD_LABEL,
  SETTINGS_LIMITS,
  SOCIALS,
  SOCIAL_HOSTS,
  type SettingsData,
  type SettingsFormValues,
  looksLikeStreetAddress,
  normaliseWhatsapp,
  settingsSchema,
} from "@/lib/validation/settings";
import { whatsappLink } from "@/lib/whatsapp";
import {
  Field,
  IdScope,
  Switch,
  controlProps,
  useUnsavedChangesWarning,
} from "../properties/editor-inputs";
import editor from "../properties/editor.module.css";
import ui from "../ui.module.css";
import styles from "./settings.module.css";

const ORDER = Object.keys(SETTINGS_FIELD_LABEL);
const WA_TEST = "Hello Verity, this is a test from the website settings.";

function errorList(errors: FieldErrors<SettingsFormValues>) {
  const e = errors as Record<string, { message?: string } | undefined>;
  return ORDER.flatMap((k) => (e[k]?.message ? [{ path: k, message: e[k]!.message! }] : []));
}

/** "Shown on: …" line under a field. */
function Where({ children }: { children: React.ReactNode }) {
  return (
    <span className={styles.where}>
      <b>Shown on:</b> {children}
    </span>
  );
}

/** The value typed, after a pause (the map preview shouldn't reload on every key). */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export type SettingsEditorProps = {
  initialValues: SettingsFormValues;
  privacyReviewedAt: string | null;
  updatedAt: string | null;
};

export function SettingsEditor({
  initialValues,
  privacyReviewedAt,
  updatedAt,
}: SettingsEditorProps) {
  // Tests wait for data-ready: typing before hydration is reset when the form registers.
  const hydrated = useHydrated();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
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
  } = useForm<SettingsFormValues, unknown, SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initialValues,
    shouldFocusError: false,
  });
  useUnsavedChangesWarning(isDirty && !pending);
  const err = (k: string) =>
    (errors as Record<string, { message?: string } | undefined>)[k]?.message;
  const v = useWatch({ control }) as SettingsFormValues;

  const focus = (path: string) =>
    requestAnimationFrame(() => {
      const el = document.getElementById(fid(path));
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const save = handleSubmit(
    () =>
      startTransition(async () => {
        setServerError(null);
        const values = getValues();
        const res = await updateSettings(values);
        if (!res.ok) {
          setServerError(res.error);
          if (res.fieldErrors) {
            for (const [k, m] of Object.entries(res.fieldErrors))
              setError(k as Path<SettingsFormValues>, { type: "server", message: m });
            const first = ORDER.find((k) => k in res.fieldErrors!);
            if (first) focus(first);
          }
          toast.error(res.error);
          return;
        }
        reset(values);
        toast.success(res.message);
        router.refresh();
      }),
    (invalid) => {
      toast.error("Please check the highlighted fields.");
      const first = errorList(invalid)[0];
      if (first) focus(first.path);
    },
  );

  const wa = normaliseWhatsapp(v.whatsapp ?? "");
  const mapQuery = useDebounced((v.mapQuery ?? "").trim(), 700);
  const streety = looksLikeStreetAddress(v.mapQuery ?? "");
  const list = submitCount > 0 || serverError ? errorList(errors) : [];

  return (
    <IdScope.Provider value={scope}>
      <div className={editor.editor}>
        <form
          className={editor.mainCol}
          aria-label="Site settings"
          data-ready={hydrated ? "true" : undefined}
          id={`${scope}form`}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {/* ---- Contact ---- */}
          <section
            id="contact"
            className={`${ui.panel} ${styles.anchor}`}
            aria-labelledby={`${scope}h-contact`}
          >
            <h2 id={`${scope}h-contact`}>Contact</h2>
            <div className={editor.fields}>
              <Field
                path="phone"
                label="Phone"
                hint={<Where>footer, contact page (“Call us”), privacy notice.</Where>}
                error={err("phone")}
              >
                <input
                  {...register("phone")}
                  {...cp("phone", err("phone"), true)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={SETTINGS_LIMITS.phone}
                  placeholder="e.g. 0803 123 4567"
                />
              </Field>
              <Field
                path="whatsapp"
                label="WhatsApp number"
                hint={
                  <>
                    <span className={styles.waLine} data-testid="wa-preview">
                      {wa ? (
                        <>
                          Saved as <span className={styles.digits}>{wa}</span>
                          <a
                            href={whatsappLink(wa, WA_TEST)!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Test link ↗
                            <span className="sr-only"> (opens WhatsApp in a new tab)</span>
                          </a>
                        </>
                      ) : v.whatsapp ? (
                        "Not a Nigerian mobile number yet."
                      ) : (
                        "Empty: WhatsApp buttons send visitors to the contact form instead."
                      )}
                    </span>
                    <Where>
                      header “WhatsApp us”, the round WhatsApp button, contact page, property and
                      plan pages.
                    </Where>
                  </>
                }
                error={err("whatsapp")}
              >
                <input
                  {...register("whatsapp")}
                  {...cp("whatsapp", err("whatsapp"), true)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="e.g. 0803 123 4567"
                />
              </Field>
              <Field
                path="email"
                label="Email"
                hint={<Where>footer, contact page (“Email us”), privacy notice.</Where>}
                error={err("email")}
                full
              >
                <input
                  {...register("email")}
                  {...cp("email", err("email"), true)}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  maxLength={SETTINGS_LIMITS.email}
                  placeholder="info@verityhomes.ng"
                />
              </Field>
            </div>
          </section>

          {/* ---- Office ---- */}
          <section
            id="office"
            className={`${ui.panel} ${styles.anchor}`}
            aria-labelledby={`${scope}h-office`}
          >
            <h2 id={`${scope}h-office`}>Office</h2>
            <div className={editor.fields}>
              <Field
                path="officeArea"
                label="Office area"
                hint={
                  <Where>footer, contact page and /about (unless the full address is shown).</Where>
                }
                error={err("officeArea")}
                full
              >
                <input
                  {...register("officeArea")}
                  {...cp("officeArea", err("officeArea"), true)}
                  maxLength={SETTINGS_LIMITS.officeArea}
                  placeholder="e.g. Onipanu, Lagos State"
                />
              </Field>
              <Field
                path="officeAddress"
                label={
                  <>
                    Office address <span className={editor.private}>Private unless shown</span>
                  </>
                }
                hint="Kept private unless you turn on “Show full address publicly” below."
                error={err("officeAddress")}
                full
              >
                <input
                  {...register("officeAddress")}
                  {...cp("officeAddress", err("officeAddress"), true)}
                  maxLength={SETTINGS_LIMITS.officeAddress}
                  autoComplete="off"
                />
              </Field>
              <div className={`${editor.f} ${editor.full}`}>
                <Switch
                  label="Show full address publicly"
                  note="Off: visitors see the office area only."
                  id={fid("showFullAddress")}
                  {...register("showFullAddress")}
                />
                {v.showFullAddress ? (
                  <div
                    className={`${ui.alert} ${ui.warn}`}
                    role="note"
                    data-testid="address-warning"
                  >
                    <div>
                      <b>Heads up:</b> This is shown on every page footer and the contact page —
                      don&apos;t use a home address.
                    </div>
                  </div>
                ) : null}
              </div>
              <Field
                path="mapQuery"
                label="Map search"
                hint="What Google Maps searches for on the contact page. Use an area or landmark, not a private street address."
                error={err("mapQuery")}
                full
              >
                <input
                  {...register("mapQuery")}
                  {...cp("mapQuery", err("mapQuery"), true)}
                  maxLength={SETTINGS_LIMITS.mapQuery}
                  placeholder="e.g. Onipanu, Lagos"
                />
              </Field>
              {streety && !v.showFullAddress ? (
                <div
                  className={`${ui.alert} ${ui.warn} ${editor.full}`}
                  role="note"
                  data-testid="map-warning"
                >
                  <div>
                    <b>This looks like a street address.</b> The contact map is public. Use an area
                    or landmark, not a private street address.
                  </div>
                </div>
              ) : null}
              <div className={`${editor.f} ${editor.full}`}>
                <span className={editor.lbl}>Map preview</span>
                <div className={editor.map}>
                  {mapQuery ? (
                    <iframe
                      className={styles.mapFrame}
                      title="Preview of the contact page map"
                      src={mapEmbedUrl(mapQuery, 14)}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      data-testid="map-preview"
                    />
                  ) : (
                    <div className={editor.mapLoading}>Type a map search to see it here</div>
                  )}
                </div>
                <Where>contact page map, “Open in Maps” and “Get directions”.</Where>
              </div>
            </div>
          </section>

          {/* ---- Company ---- */}
          <section
            id="company"
            className={`${ui.panel} ${styles.anchor}`}
            aria-labelledby={`${scope}h-company`}
          >
            <h2 id={`${scope}h-company`}>Company</h2>
            <div className={editor.fields}>
              <Field
                path="companyName"
                label="Registered company name"
                hint={<Where>footer copyright, /about, privacy notice.</Where>}
                error={err("companyName")}
              >
                <input
                  {...register("companyName")}
                  {...cp("companyName", err("companyName"), true)}
                  maxLength={SETTINGS_LIMITS.companyName}
                />
              </Field>
              <Field
                path="rcNumber"
                label="RC number"
                hint={<Where>footer, /about trust card, privacy notice. Digits only.</Where>}
                error={err("rcNumber")}
              >
                <div className={editor.prefix} data-invalid={err("rcNumber") ? "true" : undefined}>
                  <span aria-hidden="true">RC</span>
                  <input
                    {...register("rcNumber")}
                    {...cp("rcNumber", err("rcNumber"), true)}
                    inputMode="numeric"
                    maxLength={SETTINGS_LIMITS.rcNumber}
                  />
                </div>
              </Field>
              <Field
                path="openingHours"
                label="Opening hours"
                hint="Optional, e.g. Mon–Fri 9am–5pm, Sat 10am–2pm."
                error={err("openingHours")}
                full
              >
                <input
                  {...register("openingHours")}
                  {...cp("openingHours", err("openingHours"), true)}
                  maxLength={SETTINGS_LIMITS.openingHours}
                />
              </Field>
            </div>
          </section>

          {/* ---- Social ---- */}
          <section
            id="social"
            className={`${ui.panel} ${styles.anchor}`}
            aria-labelledby={`${scope}h-social`}
          >
            <h2 id={`${scope}h-social`}>
              Social media
              <span className={ui.panelNote}>Footer icons show only for filled ones</span>
            </h2>
            <div className={editor.fields}>
              {SOCIALS.map((key) => (
                <Field
                  key={key}
                  path={key}
                  label={SOCIAL_HOSTS[key].label}
                  hint={`Full address, e.g. ${SOCIAL_HOSTS[key].example}`}
                  error={err(key)}
                >
                  <input
                    {...register(key)}
                    {...cp(key, err(key), true)}
                    type="url"
                    inputMode="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={SETTINGS_LIMITS.url}
                  />
                </Field>
              ))}
            </div>
          </section>

          {/* ---- Website text (Unit 19a: was placeholder, open question 4) ---- */}
          <section
            id="content"
            className={`${ui.panel} ${styles.anchor}`}
            aria-labelledby={`${scope}h-content`}
          >
            <h2 id={`${scope}h-content`}>
              Website text
              <span className={ui.panelNote}>Empty = the placeholder stays</span>
            </h2>
            <div className={editor.fields}>
              <Field
                path="ceoBio"
                label="CEO bio"
                hint={
                  <>
                    Markdown: **bold**, _italic_, [links](https://…), lists. Blank line = new
                    paragraph.{" "}
                    <Where>
                      home “Meet our CEO”, /about “Meet Esther”, and (first paragraph) the blog
                      author box.
                    </Where>
                  </>
                }
                error={err("ceoBio")}
                full
              >
                <textarea
                  {...register("ceoBio")}
                  {...cp("ceoBio", err("ceoBio"), true)}
                  maxLength={SETTINGS_LIMITS.ceoBio}
                />
              </Field>
              <Field
                path="ceoPromise"
                label="CEO promise (one line)"
                hint={<Where>the quote under the bio on the home page and /about.</Where>}
                error={err("ceoPromise")}
                full
              >
                <input
                  {...register("ceoPromise")}
                  {...cp("ceoPromise", err("ceoPromise"), true)}
                  maxLength={SETTINGS_LIMITS.ceoPromise}
                />
              </Field>
              <Field
                path="companyStory"
                label="Company story"
                hint={
                  <>
                    Markdown, like the bio.{" "}
                    <Where>/about “Our story”, after the first paragraph.</Where>
                  </>
                }
                error={err("companyStory")}
                full
              >
                <textarea
                  {...register("companyStory")}
                  {...cp("companyStory", err("companyStory"), true)}
                  maxLength={SETTINGS_LIMITS.companyStory}
                />
              </Field>
            </div>
          </section>
        </form>

        <div className={editor.aside}>
          <section className={ui.panel} aria-labelledby={`${scope}h-save`}>
            <h2 id={`${scope}h-save`}>Save</h2>
            <p className={styles.privacyState}>
              Changes show on every page as soon as you save — no redeploy.
              {updatedAt ? ` Last saved ${formatDate(new Date(updatedAt))}.` : ""}
            </p>
            <button
              type="submit"
              form={`${scope}form`}
              className={`${ui.btn} ${ui.navy}`}
              style={{ width: "100%" }}
              disabled={pending}
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
            {isDirty ? (
              <p className={editor.hint} style={{ marginTop: 10 }} data-testid="unsaved-note">
                You have unsaved changes.
              </p>
            ) : null}
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
                          {SETTINGS_FIELD_LABEL[e.path as keyof SettingsFormValues] ?? e.path}
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
          </section>
          <PrivacyPanel reviewedAt={privacyReviewedAt} />
        </div>
      </div>
    </IdScope.Provider>
  );
}

/** “Mark privacy notice as reviewed” / “Mark as draft again” (open question Q39). */
function PrivacyPanel({ reviewedAt }: { reviewedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = (reviewed: boolean) =>
    start(async () => {
      const res = await setPrivacyReviewed(reviewed);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });
  return (
    <section
      id="privacy"
      className={`${ui.panel} ${styles.anchor}`}
      aria-labelledby="settings-h-privacy"
    >
      <h2 id="settings-h-privacy">Privacy notice</h2>
      <p className={styles.privacyState} data-testid="privacy-state">
        {reviewedAt ? (
          <>
            <b>Reviewed</b> on {formatDate(new Date(reviewedAt))}. /privacy shows no Draft banner.
          </>
        ) : (
          <>
            <b>Draft.</b> /privacy shows a “Draft” banner until the notice has been checked (open
            question Q39).
          </>
        )}
      </p>
      <div className={styles.stack}>
        {reviewedAt ? (
          <button
            type="button"
            className={`${ui.btn} ${ui.ghost}`}
            onClick={() => toggle(false)}
            disabled={pending}
          >
            Mark as draft again
          </button>
        ) : (
          <button
            type="button"
            className={`${ui.btn} ${ui.gold}`}
            onClick={() => toggle(true)}
            disabled={pending}
          >
            Mark privacy notice as reviewed
          </button>
        )}
        <a className={editor.hint} href="/privacy" target="_blank" rel="noopener noreferrer">
          Read the notice ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </section>
  );
}
