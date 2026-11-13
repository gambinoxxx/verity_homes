"use client";

// Property editor (design/admin-property-edit.html) for /admin/properties/new and /[id].
// React Hook Form + zodResolver(propertySchema); the same schema runs again in the server
// actions. Fields that don't apply to the listing type are hidden (and cleared by the schema).
// Photos and the map picker are Unit 15: their panels are here, read-only / with lat-lng inputs.
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import Link from "next/link";
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
import {
  createProperty,
  publishProperty,
  unpublishProperty,
  updateProperty,
} from "@/lib/actions/property";
import { geocodeArea } from "@/lib/actions/property-photos";
import { LISTING_LABEL, PROJECT_STATUS_LABEL, TITLE_LABEL, formatDate } from "@/lib/format";
import { metaDescription } from "@/lib/property-detail";
import { MAX_PHOTOS, roundCoord } from "@/lib/property-photos";
import { slugify } from "@/lib/slug";
import {
  FIELD_LABEL,
  LIMITS,
  LISTING_TYPES,
  PROJECT_STATUSES,
  PROPERTY_TYPES,
  type PropertyData,
  type PropertyFormValues,
  TITLE_DOCUMENTS,
  fieldId,
  isLandListing,
  propertySchema,
  publishIssues,
  showsCompletionDate,
  showsPricePeriod,
} from "@/lib/validation/property";
import { AdminIcon } from "../icons";
import ui from "../ui.module.css";
import { DeletePropertyButton } from "./delete-property-button";
import {
  FeaturesInput,
  Field,
  IdScope,
  PriceInput,
  Switch,
  controlProps,
  useUnsavedChangesWarning,
} from "./editor-inputs";
import styles from "./editor.module.css";
import { type PhotoInfo, PhotosField } from "./photos-field";

/** Leaflet needs `window`: client-only, with a placeholder while it loads. */
const MapPicker = dynamic(() => import("./map-picker"), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map…</div>,
});

const COORD_RE = /^-?\d{1,3}(\.\d+)?$/;
const coordOrNull = (s: string | undefined, limit: number): number | null => {
  const t = (s ?? "").trim();
  if (!COORD_RE.test(t)) return null;
  const n = Number(t);
  return Math.abs(n) <= limit ? n : null;
};

const PROPERTY_TYPE_LABEL: Record<(typeof PROPERTY_TYPES)[number], string> = {
  DETACHED: "Detached",
  SEMI_DETACHED: "Semi-detached",
  TERRACE: "Terrace",
  APARTMENT: "Apartment",
  BUNGALOW: "Bungalow",
  LAND: "Land",
  COMMERCIAL: "Commercial",
};
const LISTING_OPTION_LABEL = { ...LISTING_LABEL, OFF_PLAN: "Off-plan / development" };

/** Top-level order of the form, for the error summary. */
const ORDER = Object.keys(FIELD_LABEL);

type ErrorItem = { path: string; message: string };

function flattenErrors(errors: FieldErrors<PropertyFormValues>): ErrorItem[] {
  const out: ErrorItem[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    const n = node as { message?: unknown; ref?: unknown };
    if (typeof n.message === "string" && n.message) {
      out.push({ path, message: n.message });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === "ref" || k === "type" || k === "types") continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(errors, "");
  return out
    .map((e) => ({ ...e, path: e.path.replace(/\.root$/, "") }))
    .sort((a, b) => {
      const ka = ORDER.indexOf(a.path.split(".")[0] ?? "");
      const kb = ORDER.indexOf(b.path.split(".")[0] ?? "");
      return ka - kb || a.path.localeCompare(b.path, undefined, { numeric: true });
    });
}

function labelFor(path: string): string {
  const [top, index, sub] = path.split(".");
  const base = FIELD_LABEL[top ?? ""] ?? top ?? "Field";
  if (index !== undefined && /^\d+$/.test(index)) {
    const what = top === "documents" ? "Document" : top === "nearby" ? "Nearby place" : base;
    return `${what} ${Number(index) + 1}${sub ? ` (${sub === "minutes" ? "minutes" : "name"})` : ""}`;
  }
  return base;
}

function focusField(scope: string, path: string) {
  const el = document.getElementById(fieldId(path, scope));
  if (el) {
    el.focus();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

export type PropertyEditorProps = {
  /** Existing property; absent on /new. */
  property?: {
    id: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    createdAt: string;
    updatedAt: string;
    images: { id: string; url: string; alt: string; width: number | null; height: number | null }[];
  };
  initialValues: PropertyFormValues;
  /** Public site origin for the Google preview (NEXT_PUBLIC_SITE_URL host). */
  siteHost: string;
  /** Blob folder prefix for uploads ("" or "e2e/" in Playwright runs). */
  uploadPrefix: string;
};

type SaveMode = "draft" | "publish" | "save";

export function PropertyEditor({
  property,
  initialValues,
  siteHost,
  uploadPrefix,
}: PropertyEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(property));
  const [serverError, setServerError] = useState<string | null>(null);
  const isNew = !property;
  const scope = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-`;
  const sid = (name: string) => `${scope}${name}`;
  const fid = (path: string) => fieldId(path, scope);
  const cp = (path: string, error?: string, hint?: boolean) =>
    controlProps(scope, path, error, hint);
  const published = property?.status === "PUBLISHED";

  const form = useForm<PropertyFormValues, unknown, PropertyData>({
    resolver: zodResolver(propertySchema),
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    reset,
    resetField,
    getFieldState,
    formState: { errors, isDirty, submitCount },
  } = form;
  const [initialPhotoInfo] = useState<Record<string, PhotoInfo>>(() =>
    Object.fromEntries(
      (property?.images ?? []).map((i) => [i.id, { url: i.url, width: i.width, height: i.height }]),
    ),
  );
  const [geocoding, setGeocoding] = useState(false);
  const [mapMsg, setMapMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useUnsavedChangesWarning(isDirty && !pending);

  const v = useWatch({ control });
  const listingType = v.listingType ?? "SALE";
  const land = isLandListing({ listingType, propertyType: v.propertyType ?? "" });
  const showPeriod = showsPricePeriod(listingType);
  const showCompletion = showsCompletionDate(listingType);
  const pinLat = coordOrNull(v.latitude, 90);
  const pinLng = coordOrNull(v.longitude, 180);

  const setPin = (lat: number, lng: number) => {
    const opts = { shouldDirty: true, shouldValidate: submitCount > 0 };
    setValue("latitude", roundCoord(lat), opts);
    setValue("longitude", roundCoord(lng), opts);
    setMapMsg(null);
  };

  const centreOnArea = async () => {
    const area = getValues("area").trim();
    if (!area) {
      setMapMsg({ text: "Add the area first (e.g. Lekki), then try again.", error: true });
      return;
    }
    setGeocoding(true);
    setMapMsg(null);
    try {
      const res = await geocodeArea({ area, city: getValues("city") });
      if (res.ok) {
        setPin(res.data.lat, res.data.lng);
        setMapMsg({ text: "Pin moved to the area centre — now drag it onto the property." });
      } else {
        setMapMsg({ text: res.error, error: true });
      }
    } catch {
      setMapMsg({ text: "The map search didn't respond. Drag the pin instead.", error: true });
    } finally {
      setGeocoding(false);
    }
  };

  // New property: the web address follows the title until it's edited by hand.
  const title = v.title ?? "";
  useEffect(() => {
    if (!slugTouched) setValue("slug", slugify(title).slice(0, LIMITS.slug), { shouldDirty: true });
  }, [title, slugTouched, setValue]);

  // Rentals need a period; switching to rent picks "per year" instead of leaving "one-off".
  useEffect(() => {
    if (showPeriod && getValues("pricePeriod") === "ONE_OFF") setValue("pricePeriod", "PER_YEAR");
  }, [showPeriod, getValues, setValue]);

  const documents = useFieldArray({ control, name: "documents", keyName: "key" });
  const nearby = useFieldArray({ control, name: "nearby", keyName: "key" });

  const err = (path: string): string | undefined =>
    (get(errors, path) as { message?: string } | undefined)?.message;

  function applyServerErrors(fieldErrors: Record<string, string> | undefined) {
    if (!fieldErrors) return;
    const paths = Object.keys(fieldErrors);
    for (const path of paths) {
      setError(path as Path<PropertyFormValues>, { type: "server", message: fieldErrors[path] });
    }
    const first = flattenErrors(
      Object.fromEntries(
        paths.map((p) => [p, { message: fieldErrors[p] }]),
      ) as FieldErrors<PropertyFormValues>,
    )[0];
    if (first) requestAnimationFrame(() => focusField(scope, first.path));
  }

  const save = (mode: SaveMode) =>
    handleSubmit(
      () =>
        startTransition(async () => {
          setServerError(null);
          const values = getValues();
          if (mode === "publish") {
            const issues = publishIssues({
              title: values.title,
              area: values.area,
              hasPrice: values.price.trim() !== "",
              priceOnRequest: values.priceOnRequest,
            });
            if (Object.keys(issues).length) {
              applyServerErrors(issues);
              toast.error("A few things are needed before publishing.");
              return;
            }
          }
          const res = property
            ? await updateProperty(property.id, values)
            : await createProperty(values);
          if (!res.ok) {
            setServerError(res.error);
            applyServerErrors(res.fieldErrors);
            toast.error(res.error);
            return;
          }
          reset({ ...values, slug: res.data.slug }); // clears "unsaved changes"
          let message = res.message;
          if (mode === "publish") {
            const pub = await publishProperty(res.data.id);
            if (!pub.ok) {
              setServerError(pub.error);
              applyServerErrors(pub.fieldErrors);
              toast.error(`Saved as a draft, but not published: ${pub.error}`);
              if (isNew) router.replace(`/admin/properties/${res.data.id}`);
              return;
            }
            message = pub.message;
          }
          toast.success(message);
          if (isNew) router.replace(`/admin/properties/${res.data.id}`);
          else router.refresh();
        }),
      (invalid) => {
        toast.error("Please check the highlighted fields.");
        const first = flattenErrors(invalid)[0];
        if (first) requestAnimationFrame(() => focusField(scope, first.path));
      },
    )();

  const unpublish = () =>
    startTransition(async () => {
      if (!property) return;
      const res = await unpublishProperty(property.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.refresh();
    });

  const errorList = submitCount > 0 || serverError ? flattenErrors(errors) : [];
  const serpTitle = `${(v.seoTitle ?? "").trim() || title.trim() || "Property title"} — Verity Homes and Properties`;
  const serpDesc = metaDescription({
    seoDescription: v.seoDescription ?? "",
    description: v.description ?? "",
    listingType,
    area: (v.area ?? "").trim() || "[area]",
    city: (v.city ?? "").trim() || "Lagos",
  });
  const savedSlug = property?.slug ?? "";

  return (
    <IdScope.Provider value={scope}>
      <form
        className={styles.editor}
        aria-label="Property editor"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(published ? "save" : "draft");
        }}
      >
        <div className={styles.mainCol}>
          {/* ---- Basics ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-basics")}>
            <h2 id={sid("sec-basics")}>Basics</h2>
            <div className={styles.fields}>
              <Field
                path="title"
                label="Title"
                hint="Shown on cards and as the page heading."
                error={err("title")}
                full
              >
                <input
                  {...register("title")}
                  {...cp("title", err("title"), true)}
                  maxLength={LIMITS.title}
                />
              </Field>
              <Field
                path="slug"
                label="Web address"
                hint={
                  published
                    ? "Changing it after publishing breaks shared links, so a redirect from the old address is added automatically."
                    : "Created from the title. Lowercase letters, numbers and hyphens."
                }
                error={err("slug")}
                full
              >
                <div className={styles.prefix} data-invalid={err("slug") ? "true" : undefined}>
                  <span aria-hidden="true">/properties/</span>
                  <input
                    {...register("slug", { onChange: () => setSlugTouched(true) })}
                    {...cp("slug", err("slug"), true)}
                    maxLength={LIMITS.slug}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </Field>
              <Field path="listingType" label="Listing type" error={err("listingType")}>
                <select {...register("listingType")} {...cp("listingType", err("listingType"))}>
                  {LISTING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LISTING_OPTION_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field path="propertyType" label="Property type" error={err("propertyType")}>
                <select {...register("propertyType")} {...cp("propertyType", err("propertyType"))}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PROPERTY_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          {/* ---- Price ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-price")}>
            <h2 id={sid("sec-price")}>Price</h2>
            <div className={`${styles.fields} ${styles.three}`}>
              <Field path="price" label="Price" error={err("price")}>
                <div className={styles.prefix} data-invalid={err("price") ? "true" : undefined}>
                  <span aria-hidden="true">₦</span>
                  <Controller
                    control={control}
                    name="price"
                    render={({ field }) => (
                      <PriceInput
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        {...cp("price", err("price"))}
                      />
                    )}
                  />
                </div>
              </Field>
              {showPeriod ? (
                <Field
                  path="pricePeriod"
                  label="Per"
                  hint="Rentals only."
                  error={err("pricePeriod")}
                >
                  <select
                    {...register("pricePeriod")}
                    {...cp("pricePeriod", err("pricePeriod"), true)}
                  >
                    <option value="PER_YEAR">Per year</option>
                    <option value="PER_MONTH">Per month</option>
                  </select>
                </Field>
              ) : null}
              <div className={styles.f}>
                <span className={styles.lbl}>Display</span>
                <Switch label="Show “Price on request”" {...register("priceOnRequest")} />
              </div>
            </div>
          </section>

          {/* ---- Details ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-details")}>
            <h2 id={sid("sec-details")}>Details</h2>
            <div className={`${styles.fields} ${styles.three}`}>
              {land ? null : (
                <>
                  <Field path="bedrooms" label="Bedrooms" error={err("bedrooms")}>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      {...register("bedrooms")}
                      {...cp("bedrooms", err("bedrooms"))}
                    />
                  </Field>
                  <Field path="bathrooms" label="Bathrooms" error={err("bathrooms")}>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      {...register("bathrooms")}
                      {...cp("bathrooms", err("bathrooms"))}
                    />
                  </Field>
                </>
              )}
              <Field path="sizeSqm" label="Size (sqm)" error={err("sizeSqm")}>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  {...register("sizeSqm")}
                  {...cp("sizeSqm", err("sizeSqm"))}
                />
              </Field>
              {land ? null : (
                <Field path="parkingSpaces" label="Parking spaces" error={err("parkingSpaces")}>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    {...register("parkingSpaces")}
                    {...cp("parkingSpaces", err("parkingSpaces"))}
                  />
                </Field>
              )}
              <Field path="titleDocument" label="Title document" error={err("titleDocument")}>
                <select
                  {...register("titleDocument")}
                  {...cp("titleDocument", err("titleDocument"))}
                >
                  <option value="">Not set</option>
                  {TITLE_DOCUMENTS.map((t) => (
                    <option key={t} value={t}>
                      {TITLE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              {showCompletion ? (
                <Field
                  path="completionDate"
                  label="Completion date"
                  hint="Off-plan only."
                  error={err("completionDate")}
                >
                  <input
                    type="month"
                    {...register("completionDate")}
                    {...cp("completionDate", err("completionDate"), true)}
                  />
                </Field>
              ) : null}
              <Field path="description" label="Description" error={err("description")} full>
                <textarea
                  {...register("description")}
                  {...cp("description", err("description"))}
                  placeholder="Layout, finishes, what makes it special, who it suits…"
                />
              </Field>
              <Field
                path="features"
                label="Features & amenities"
                hint="Press Enter after each one."
                error={err("features")}
                full
              >
                <Controller
                  control={control}
                  name="features"
                  render={({ field }) => (
                    <FeaturesInput
                      id={fid("features")}
                      value={field.value}
                      onChange={field.onChange}
                      max={LIMITS.features}
                      maxLength={LIMITS.feature}
                      invalid={Boolean(err("features"))}
                      describedBy={`${fid("features")}-hint`}
                    />
                  )}
                />
              </Field>
            </div>
          </section>

          {/* ---- Photos ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-photos")}>
            <h2 id={sid("sec-photos")}>
              Photos
              <span className={ui.panelNote}>
                {(v.photos ?? []).length} of {MAX_PHOTOS} · first photo is the cover
              </span>
            </h2>
            <PhotosField
              propertyId={property?.id ?? null}
              uploadPrefix={uploadPrefix}
              initialInfo={initialPhotoInfo}
              control={control}
              register={register}
              setValue={setValue}
              getValues={getValues}
              getFieldState={getFieldState}
              resetField={resetField}
              scope={scope}
            />
          </section>

          {/* ---- Location ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-location")}>
            <h2 id={sid("sec-location")}>Location &amp; map</h2>
            <div className={styles.fields}>
              <Field
                path="address"
                label={
                  <>
                    Address <span className={styles.private}>Private</span>
                  </>
                }
                hint="Never shown on the website. Only you see it here — share it at inspection."
                error={err("address")}
                full
              >
                <input
                  {...register("address")}
                  {...cp("address", err("address"), true)}
                  placeholder="Street address (kept private)"
                  autoComplete="off"
                />
              </Field>
              <Field
                path="area"
                label="Area"
                hint="Shown on cards, e.g. “Lekki, Lagos”."
                error={err("area")}
              >
                <input {...register("area")} {...cp("area", err("area"), true)} />
              </Field>
              <Field path="city" label="City / State" error={err("city")}>
                <input {...register("city")} {...cp("city", err("city"))} />
              </Field>
              <div className={`${styles.f} ${styles.full}`}>
                <span className={styles.lbl} id={sid("map-label")}>
                  Map pin
                </span>
                <span className={styles.hint}>
                  Click the map or drag the pin so it sits on the property. The coordinates below
                  update as you go, and typing them moves the pin.
                </span>
                <div className={styles.map} data-testid="map-picker">
                  <MapPicker
                    lat={pinLat}
                    lng={pinLng}
                    onPick={setPin}
                    label="Map: click to place the property pin"
                  />
                </div>
                <div className={styles.mapBar}>
                  <button
                    type="button"
                    className={`${ui.btn} ${ui.ghost}`}
                    onClick={centreOnArea}
                    disabled={geocoding}
                  >
                    {geocoding ? "Finding the area…" : "Centre on area"}
                  </button>
                  <span
                    className={`${styles.mapMsg} ${mapMsg?.error ? styles.mapMsgError : ""}`}
                    role="status"
                  >
                    {mapMsg?.text ??
                      "Moves the pin to the centre of the area and city above (OpenStreetMap search)."}
                  </span>
                </div>
              </div>
              <Field path="latitude" label="Latitude" error={err("latitude")}>
                <input
                  inputMode="decimal"
                  placeholder="e.g. 6.4474"
                  {...register("latitude")}
                  {...cp("latitude", err("latitude"))}
                />
              </Field>
              <Field path="longitude" label="Longitude" error={err("longitude")}>
                <input
                  inputMode="decimal"
                  placeholder="e.g. 3.4720"
                  {...register("longitude")}
                  {...cp("longitude", err("longitude"))}
                />
              </Field>
              <div className={`${styles.f} ${styles.full}`}>
                <Switch
                  label="Show exact location on the map"
                  note="On: the public map shows this pin. Off: it shows the area only (e.g. “Lekki, Lagos”) and says the exact address is shared at inspection."
                  id={fid("showExactLocation")}
                  aria-invalid={err("showExactLocation") ? true : undefined}
                  {...register("showExactLocation")}
                />
                {err("showExactLocation") ? (
                  <span className={styles.err}>{err("showExactLocation")}</span>
                ) : null}
              </div>
              <div className={`${styles.f} ${styles.full}`}>
                <span className={styles.lbl} id={sid("nearby-label")}>
                  Nearby places
                </span>
                <span className={styles.hint}>e.g. “Lekki Toll Gate — 5 minutes”.</span>
                <div className={styles.rows} role="group" aria-labelledby={sid("nearby-label")}>
                  {nearby.fields.map((row, i) => (
                    <div key={row.key} className={`${styles.row} ${styles.rowNearby}`}>
                      <div className={styles.f}>
                        <label className="sr-only" htmlFor={fid(`nearby.${i}.place`)}>
                          Place {i + 1}
                        </label>
                        <input
                          placeholder="Place"
                          maxLength={LIMITS.place}
                          {...register(`nearby.${i}.place`)}
                          {...cp(`nearby.${i}.place`, err(`nearby.${i}.place`))}
                        />
                        {err(`nearby.${i}.place`) ? (
                          <span className={styles.err} id={`${fid(`nearby.${i}.place`)}-err`}>
                            {err(`nearby.${i}.place`)}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.f}>
                        <label className="sr-only" htmlFor={fid(`nearby.${i}.minutes`)}>
                          Minutes away for place {i + 1}
                        </label>
                        <input
                          type="number"
                          min={1}
                          inputMode="numeric"
                          placeholder="Minutes"
                          {...register(`nearby.${i}.minutes`)}
                          {...cp(`nearby.${i}.minutes`, err(`nearby.${i}.minutes`))}
                        />
                        {err(`nearby.${i}.minutes`) ? (
                          <span className={styles.err} id={`${fid(`nearby.${i}.minutes`)}-err`}>
                            {err(`nearby.${i}.minutes`)}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={ui.iconBtn}
                        style={{ marginTop: 3 }}
                        aria-label={`Remove place ${i + 1}`}
                        onClick={() => nearby.remove(i)}
                      >
                        <AdminIcon name="x" />
                      </button>
                    </div>
                  ))}
                  {nearby.fields.length < LIMITS.nearby ? (
                    <button
                      type="button"
                      className={`${ui.btn} ${ui.ghost} ${styles.addRow}`}
                      onClick={() => nearby.append({ place: "", minutes: "" })}
                    >
                      <AdminIcon name="plus" />
                      Add a nearby place
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* ---- Documents ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-docs")}>
            <h2 id={sid("sec-docs")}>Documents</h2>
            <div className={styles.rows}>
              {documents.fields.length === 0 ? (
                <p className={styles.emptyRows}>
                  No documents yet. Add the title papers and approvals buyers will ask about.
                </p>
              ) : null}
              {documents.fields.map((row, i) => (
                <div key={row.key} className={styles.row}>
                  <div className={styles.f}>
                    <label className="sr-only" htmlFor={fid(`documents.${i}.name`)}>
                      Document {i + 1} name
                    </label>
                    <input
                      placeholder="e.g. Certificate of Occupancy"
                      maxLength={LIMITS.document}
                      {...register(`documents.${i}.name`)}
                      {...cp(`documents.${i}.name`, err(`documents.${i}.name`))}
                    />
                    {err(`documents.${i}.name`) ? (
                      <span className={styles.err} id={`${fid(`documents.${i}.name`)}-err`}>
                        {err(`documents.${i}.name`)}
                      </span>
                    ) : null}
                  </div>
                  <Switch
                    className={styles.verified}
                    label="Verified"
                    aria-label={`Document ${i + 1} verified`}
                    {...register(`documents.${i}.verified`)}
                  />
                  <button
                    type="button"
                    className={ui.iconBtn}
                    style={{ marginTop: 3 }}
                    aria-label={`Remove document ${i + 1}`}
                    onClick={() => documents.remove(i)}
                  >
                    <AdminIcon name="x" />
                  </button>
                </div>
              ))}
              {documents.fields.length < LIMITS.documents ? (
                <button
                  type="button"
                  className={`${ui.btn} ${ui.ghost} ${styles.addRow}`}
                  onClick={() => documents.append({ name: "", verified: true })}
                >
                  <AdminIcon name="plus" />
                  Add a document
                </button>
              ) : null}
              <span className={styles.hint}>
                “Verified” documents are marked as such on the listing.
              </span>
            </div>
          </section>
        </div>

        <div className={styles.aside}>
          {/* ---- Publish ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-publish")}>
            <h2 id={sid("sec-publish")}>Publish</h2>
            <div className={styles.status}>
              <span>
                Status
                <small>{published ? "Visible on the website" : "Draft — not on the website"}</small>
              </span>
              <span className={`${ui.badge} ${published ? ui.pub : ui.draft}`}>
                {published ? "Published" : "Draft"}
              </span>
            </div>
            <Switch label="Featured" note="Shown on the home page" {...register("featured")} />
            <Switch
              label="Showcase"
              note="In “Developments we're proud of”"
              {...register("showcase")}
            />
            {v.showcase ? (
              <div className={`${styles.f} ${styles.indent}`}>
                <label htmlFor={fid("projectStatus")}>Project status</label>
                <select {...register("projectStatus")} {...cp("projectStatus")}>
                  <option value="">No status pill</option>
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PROJECT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
            {errorList.length ? (
              <div className={`${ui.alert} ${ui.error} ${styles.summary}`} role="alert">
                <div>
                  <b>
                    {errorList.length === 1
                      ? "1 thing to fix"
                      : `${errorList.length} things to fix`}
                  </b>
                  <ul>
                    {errorList.map((e) => (
                      <li key={e.path}>
                        <a
                          href={`#${fid(e.path)}`}
                          onClick={(ev) => {
                            ev.preventDefault();
                            focusField(scope, e.path);
                          }}
                        >
                          {labelFor(e.path)}
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
              {property ? (
                <span>
                  Created {formatDate(new Date(property.createdAt))} · Updated{" "}
                  {formatDate(new Date(property.updatedAt))}
                </span>
              ) : (
                <span>New property — saved as a draft until you publish it.</span>
              )}
              {published ? (
                <a href={`/properties/${savedSlug}`} target="_blank" rel="noopener noreferrer">
                  Preview on site ↗<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span
                  className={styles.previewOff}
                  aria-disabled="true"
                  title="Publish first — drafts aren't on the website yet"
                  tabIndex={0}
                  aria-describedby={sid("preview-off-hint")}
                >
                  Preview on site ↗
                  <span id={sid("preview-off-hint")} className="sr-only">
                    Unavailable: publish first — drafts aren&apos;t on the website yet.
                  </span>
                </span>
              )}
            </div>
          </section>

          {/* ---- Google preview + SEO ---- */}
          <section className={ui.panel} aria-labelledby={sid("sec-seo")}>
            <h2 id={sid("sec-seo")}>Google preview</h2>
            <div className={styles.serp} aria-label="How this may look in Google">
              <div className={styles.serpUrl}>
                {siteHost} › properties › {v.slug || "web-address"}
              </div>
              <div className={styles.serpTitle}>{serpTitle}</div>
              <div className={styles.serpDesc}>{serpDesc}</div>
            </div>
            <div className={styles.rows}>
              <Field
                path="seoTitle"
                label="SEO title"
                hint={`Optional. Up to ${LIMITS.seoTitle} characters; the title is used if empty.`}
                error={err("seoTitle")}
              >
                <input
                  {...register("seoTitle")}
                  {...cp("seoTitle", err("seoTitle"), true)}
                  maxLength={LIMITS.seoTitle}
                />
              </Field>
              <Field
                path="seoDescription"
                label="SEO description"
                hint={`Optional. Up to ${LIMITS.seoDescription} characters; the description's first paragraph is used if empty.`}
                error={err("seoDescription")}
              >
                <textarea
                  className={styles.short}
                  {...register("seoDescription")}
                  {...cp("seoDescription", err("seoDescription"), true)}
                  maxLength={LIMITS.seoDescription}
                />
              </Field>
            </div>
          </section>

          {property ? (
            <section className={ui.panel} aria-labelledby={sid("sec-danger")}>
              <h2 id={sid("sec-danger")}>Danger zone</h2>
              <DeletePropertyButton
                id={property.id}
                title={getValues("title") || "this property"}
                variant="panel"
                redirectTo="/admin/properties"
                onDeleted={() => reset(getValues())}
              />
              <p className={styles.dangerNote}>
                Deletes the listing and all its photos. This can&apos;t be undone.
              </p>
            </section>
          ) : null}
        </div>
      </form>
    </IdScope.Provider>
  );
}

export function EditorCancel() {
  return (
    <Link href="/admin/properties" className={`${ui.btn} ${ui.ghost}`} prefetch={false}>
      Cancel
    </Link>
  );
}
