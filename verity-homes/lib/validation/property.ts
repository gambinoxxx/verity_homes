// Property editor schema (Unit 14), shared by the admin form (React Hook Form + zodResolver) and
// the server actions in lib/actions/property.ts. Input = what the form holds (strings from the
// inputs); output = what the database gets (kobo BigInt, numbers, Date, nulls).
// Fields that don't apply are cleared here, so hidden fields never save stale values:
// beds/baths for land, price period outside rentals, completion date outside off-plan,
// project status without "showcase".
import { z } from "zod";
import { koboFromNaira } from "@/lib/format";
import { ALT_MAX, MAX_PHOTOS } from "@/lib/property-photos";
import { GUARANTEE_MESSAGE, mentionsGuarantee } from "./no-guarantee";

export const LISTING_TYPES = ["SALE", "RENT", "LAND", "OFF_PLAN"] as const;
export const PROPERTY_TYPES = [
  "DETACHED",
  "SEMI_DETACHED",
  "TERRACE",
  "APARTMENT",
  "BUNGALOW",
  "LAND",
  "COMMERCIAL",
] as const;
export const PRICE_PERIODS = ["ONE_OFF", "PER_YEAR", "PER_MONTH"] as const;
export const TITLE_DOCUMENTS = [
  "C_OF_O",
  "GOVERNORS_CONSENT",
  "REGISTERED_DEED",
  "EXCISION",
  "OTHER",
] as const;
export const PROJECT_STATUSES = [
  "SELLING_NOW",
  "OFF_PLAN",
  "UNDER_CONSTRUCTION",
  "COMPLETED",
] as const;

export type ListingType = (typeof LISTING_TYPES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DECIMAL_RE = /^-?\d{1,3}(\.\d{1,8})?$/;

export const LIMITS = {
  title: 120,
  slug: 80,
  description: 20_000,
  feature: 60,
  features: 30,
  document: 120,
  documents: 20,
  place: 80,
  nearby: 12,
  minutes: 300,
  seoTitle: 70,
  seoDescription: 160,
  area: 80,
  city: 80,
  address: 200,
  plots: 20,
  plotLabel: 60,
  suitableFor: 80,
  developerName: 100,
  note: 200,
} as const;

/** Field rules and their own types — what applies to which listing (used by the form too). */
export const isLandListing = (v: { listingType: string; propertyType: string }) =>
  v.listingType === "LAND" || v.propertyType === "LAND";
export const showsPricePeriod = (listingType: string) => listingType === "RENT";
export const showsCompletionDate = (listingType: string) => listingType === "OFF_PLAN";

const text = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

/** "" → null; otherwise a whole number from 0 to max. */
const optionalCount = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((s) => s === "" || /^\d+$/.test(s), `${label}: use a whole number, e.g. 3`)
    .transform((s) => (s === "" ? null : Number(s)))
    .refine((n) => n === null || n <= max, `${label} looks too large`);

const optionalCoord = (label: string, limit: number) =>
  z
    .string()
    .trim()
    .refine((s) => s === "" || DECIMAL_RE.test(s), `${label}: use a number like 6.4474`)
    .transform((s) => (s === "" ? null : Number(s)))
    .refine(
      (n) => n === null || Math.abs(n) <= limit,
      `${label} must be between -${limit} and ${limit}`,
    );

/** Text that must not promise returns ("guarantee", "guaranteed"). Unit 17b fields. */
const plainCopy = (max: number, tooLong: string) =>
  text(max, tooLong).refine((v) => !mentionsGuarantee(v), GUARANTEE_MESSAGE);

const nairaAmount = (label: string, required: boolean) =>
  z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (v === "") {
        if (required) ctx.addIssue({ code: "custom", message: `Add the ${label}` });
        return;
      }
      try {
        if (koboFromNaira(v) <= 0n)
          ctx.addIssue({ code: "custom", message: `Enter a ${label} above ₦0` });
      } catch {
        ctx.addIssue({ code: "custom", message: `Enter the ${label} in naira, e.g. 18,000,000` });
      }
    });

/** One plot size on an estate (Unit 17b). */
const plotSchema = z
  .object({
    id: z.string().max(40).optional(),
    label: plainCopy(LIMITS.plotLabel, "Keep the plot name under 60 characters"),
    sizeSqm: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) > 0, "Size: a whole number of sqm above 0")
      .transform(Number)
      .refine((n) => n <= 10_000_000, "Size looks too large"),
    price: nairaAmount("plot price", true),
    deposit: nairaAmount("deposit", false),
    suitableFor: plainCopy(LIMITS.suitableFor, "Keep “suitable for” under 80 characters"),
  })
  .superRefine((p, ctx) => {
    try {
      if (p.deposit !== "" && koboFromNaira(p.deposit) > koboFromNaira(p.price)) {
        ctx.addIssue({
          code: "custom",
          path: ["deposit"],
          message: "The deposit can't be more than the plot price",
        });
      }
    } catch {
      // amount errors are reported on the fields themselves
    }
  });

const documentSchema = z.object({
  id: z.string().max(40).optional(),
  name: text(LIMITS.document, "Keep the document name under 120 characters").min(
    1,
    "Name the document, or remove it",
  ),
  verified: z.boolean(),
});

const nearbySchema = z.object({
  place: text(LIMITS.place, "Keep the place name under 80 characters").min(
    1,
    "Name the place, or remove it",
  ),
  minutes: z
    .string()
    .trim()
    .refine((s) => /^\d+$/.test(s) && Number(s) >= 1, "Minutes: use a whole number, e.g. 5")
    .transform(Number)
    .refine((n) => n <= LIMITS.minutes, "Minutes looks too large"),
});

export const propertySchema = z
  .object({
    title: text(LIMITS.title, "Keep the title under 120 characters").min(1, "Add a title"),
    slug: z
      .string()
      .trim()
      .max(LIMITS.slug, "Keep the web address under 80 characters")
      .refine(
        (s) => s === "" || SLUG_RE.test(s),
        "Use lowercase letters, numbers and single hyphens, e.g. 4-bed-duplex-lekki",
      ),
    listingType: z.enum(LISTING_TYPES, "Choose a listing type"),
    propertyType: z.enum(PROPERTY_TYPES, "Choose a property type"),
    price: z.string().trim(),
    pricePeriod: z.enum(PRICE_PERIODS),
    priceOnRequest: z.boolean(),
    bedrooms: optionalCount("Bedrooms", 100),
    bathrooms: optionalCount("Bathrooms", 100),
    sizeSqm: optionalCount("Size", 10_000_000),
    parkingSpaces: optionalCount("Parking spaces", 1_000),
    titleDocument: z.union([z.literal(""), z.enum(TITLE_DOCUMENTS)]),
    completionDate: z
      .string()
      .trim()
      .refine((s) => s === "" || MONTH_RE.test(s), "Choose a month and year"),
    description: text(LIMITS.description, "The description is too long"),
    features: z
      .array(text(LIMITS.feature, "Keep each feature under 60 characters").min(1))
      .max(LIMITS.features, `Up to ${LIMITS.features} features`),
    documents: z.array(documentSchema).max(LIMITS.documents, `Up to ${LIMITS.documents} documents`),
    address: text(LIMITS.address, "Keep the address under 200 characters"),
    area: text(LIMITS.area, "Keep the area under 80 characters"),
    city: text(LIMITS.city, "Keep the city under 80 characters"),
    latitude: optionalCoord("Latitude", 90),
    longitude: optionalCoord("Longitude", 180),
    showExactLocation: z.boolean(),
    nearby: z.array(nearbySchema).max(LIMITS.nearby, `Up to ${LIMITS.nearby} nearby places`),
    featured: z.boolean(),
    showcase: z.boolean(),
    projectStatus: z.union([z.literal(""), z.enum(PROJECT_STATUSES)]),
    seoTitle: text(LIMITS.seoTitle, "Keep the SEO title under 70 characters"),
    seoDescription: text(LIMITS.seoDescription, "Keep the SEO description under 160 characters"),
    /** Unit 17b: plot options (empty = an ordinary single-price listing). */
    plots: z.array(plotSchema).max(LIMITS.plots, `Up to ${LIMITS.plots} plot options`).default([]),
    developerName: plainCopy(
      LIMITS.developerName,
      "Keep the developer name under 100 characters",
    ).default(""),
    paymentPlan: plainCopy(LIMITS.note, "Keep the payment plan under 200 characters").default(""),
    offerNote: plainCopy(LIMITS.note, "Keep the offer under 200 characters").default(""),
    /** "YYYY-MM-DD": the offer shows until the end of that day (Lagos time). */
    offerEndsAt: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Choose a date")
      .default(""),
    termsNote: plainCopy(LIMITS.note, "Keep the terms note under 200 characters").default(""),
    /** Unit 15: existing photos in their new order, with alt text (url etc. are display-only). */
    photos: z
      .array(
        z.object({
          id: z.string().min(1).max(40),
          alt: text(ALT_MAX, `Keep each photo description under ${ALT_MAX} characters`),
        }),
      )
      .max(MAX_PHOTOS)
      .optional(),
    /** Photos removed in the editor; deleted (row + Blob file) only when the property is saved. */
    removedPhotoIds: z
      .array(z.string().min(1).max(40))
      .max(MAX_PHOTOS * 2)
      .optional(),
  })
  .superRefine((v, ctx) => {
    const hasPlots = v.plots.length > 0;
    if (!hasPlots && !v.priceOnRequest && v.price !== "") {
      try {
        if (koboFromNaira(v.price) <= 0n)
          ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price above ₦0" });
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["price"],
          message: "Enter the price in naira, e.g. 250,000,000",
        });
      }
    }
    if (!hasPlots && showsPricePeriod(v.listingType) && v.pricePeriod === "ONE_OFF") {
      ctx.addIssue({
        code: "custom",
        path: ["pricePeriod"],
        message: "Choose per year or per month for a rental",
      });
    }
    if ((v.latitude === null) !== (v.longitude === null)) {
      const path = v.latitude === null ? "latitude" : "longitude";
      ctx.addIssue({ code: "custom", path: [path], message: "Add both latitude and longitude" });
    }
    if (v.showExactLocation && v.latitude === null) {
      ctx.addIssue({
        code: "custom",
        path: ["showExactLocation"],
        message: "Add latitude and longitude to show the exact location",
      });
    }
  })
  .transform((v) => {
    const land = isLandListing(v);
    const plots = v.plots.map((p, i) => ({
      id: p.id,
      label: p.label === "" ? null : p.label,
      sizeSqm: p.sizeSqm,
      priceKobo: koboFromNaira(p.price),
      initialDepositKobo: p.deposit === "" ? null : koboFromNaira(p.deposit),
      suitableFor: p.suitableFor === "" ? null : p.suitableFor,
      sortOrder: i,
    }));
    const hasPlots = plots.length > 0;
    const single =
      v.price === ""
        ? null
        : (() => {
            try {
              return koboFromNaira(v.price);
            } catch {
              return null;
            }
          })();
    // With plots, the listing's price is its cheapest plot ("From ₦…"), used for sorting.
    const priceKobo = hasPlots
      ? plots.map((p) => p.priceKobo).reduce((a, b) => (b < a ? b : a))
      : single;
    const seen = new Set<string>();
    const features = v.features.filter((f) => {
      const key = f.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      title: v.title,
      /** "" = generate from the title (create only). */
      slug: v.slug,
      listingType: v.listingType,
      propertyType: v.propertyType,
      priceKobo,
      pricePeriod:
        !hasPlots && showsPricePeriod(v.listingType) ? v.pricePeriod : ("ONE_OFF" as const),
      priceOnRequest: hasPlots ? false : v.priceOnRequest,
      plots,
      developerName: v.developerName === "" ? null : v.developerName,
      paymentPlan: v.paymentPlan === "" ? null : v.paymentPlan,
      offerNote: v.offerNote === "" ? null : v.offerNote,
      offerEndsAt: v.offerEndsAt === "" ? null : new Date(`${v.offerEndsAt}T23:59:59+01:00`),
      termsNote: v.termsNote === "" ? null : v.termsNote,
      bedrooms: land ? null : v.bedrooms,
      bathrooms: land ? null : v.bathrooms,
      sizeSqm: v.sizeSqm,
      parkingSpaces: v.parkingSpaces,
      titleDocument: v.titleDocument === "" ? null : v.titleDocument,
      completionDate:
        showsCompletionDate(v.listingType) && v.completionDate
          ? new Date(`${v.completionDate}-01T00:00:00Z`)
          : null,
      description: v.description,
      features,
      documents: v.documents.map((d, i) => ({ ...d, sortOrder: i })),
      address: v.address === "" ? null : v.address,
      area: v.area,
      city: v.city === "" ? "Lagos" : v.city,
      latitude: v.latitude,
      longitude: v.longitude,
      showExactLocation: v.latitude === null ? false : v.showExactLocation,
      nearby: v.nearby,
      featured: v.featured,
      showcase: v.showcase,
      projectStatus: v.showcase && v.projectStatus !== "" ? v.projectStatus : null,
      seoTitle: v.seoTitle === "" ? null : v.seoTitle,
      seoDescription: v.seoDescription === "" ? null : v.seoDescription,
      photos: v.photos ? { items: v.photos, removedIds: v.removedPhotoIds ?? [] } : undefined,
    };
  });

export type PropertyFormValues = z.input<typeof propertySchema>;
export type PropertyData = z.output<typeof propertySchema>;

/** A blank editor. */
export const EMPTY_PROPERTY: PropertyFormValues = {
  title: "",
  slug: "",
  listingType: "SALE",
  propertyType: "DETACHED",
  price: "",
  pricePeriod: "ONE_OFF",
  priceOnRequest: false,
  bedrooms: "",
  bathrooms: "",
  sizeSqm: "",
  parkingSpaces: "",
  titleDocument: "",
  completionDate: "",
  description: "",
  features: [],
  documents: [],
  address: "",
  area: "",
  city: "Lagos",
  latitude: "",
  longitude: "",
  showExactLocation: false,
  nearby: [],
  featured: false,
  showcase: false,
  projectStatus: "",
  seoTitle: "",
  seoDescription: "",
  plots: [],
  developerName: "",
  paymentPlan: "",
  offerNote: "",
  offerEndsAt: "",
  termsNote: "",
  photos: [],
  removedPhotoIds: [],
};

export type PublishField = "title" | "area" | "price";

/**
 * What a property needs before it can go live: a title, an area, a listing type (always set by
 * the schema) and a price or "Price on request". Empty → ready.
 */
export function publishIssues(v: {
  title: string;
  area: string;
  hasPrice: boolean;
  priceOnRequest: boolean;
}): Partial<Record<PublishField, string>> {
  const issues: Partial<Record<PublishField, string>> = {};
  if (!v.title.trim()) issues.title = "Add a title before publishing";
  if (!v.area.trim()) issues.area = "Add the area before publishing (e.g. Lekki)";
  if (!v.hasPrice && !v.priceOnRequest)
    issues.price = "Add a price, or turn on “Price on request”, before publishing";
  return issues;
}

/** Field ids in the editor (error summary links, focus). Arrays: f-documents-0-name. */
export function fieldId(path: string, scope = ""): string {
  return `${scope}f-${path.replace(/\./g, "-")}`;
}

/** Labels for the error summary. */
export const FIELD_LABEL: Record<string, string> = {
  title: "Title",
  slug: "Web address",
  listingType: "Listing type",
  propertyType: "Property type",
  price: "Price",
  pricePeriod: "Per",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  sizeSqm: "Size",
  parkingSpaces: "Parking spaces",
  titleDocument: "Title document",
  completionDate: "Completion date",
  description: "Description",
  features: "Features",
  documents: "Documents",
  address: "Address",
  area: "Area",
  city: "City / State",
  latitude: "Latitude",
  longitude: "Longitude",
  showExactLocation: "Show exact location",
  nearby: "Nearby places",
  projectStatus: "Project status",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  plots: "Plot options",
  developerName: "Developer",
  paymentPlan: "Payment plan",
  offerNote: "Offer",
  offerEndsAt: "Offer ends",
  termsNote: "Terms note",
  photos: "Photos",
};

// ---- Action inputs ----

export const propertyIdSchema = z.string().trim().min(1).max(40);
