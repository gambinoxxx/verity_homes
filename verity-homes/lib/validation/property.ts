// Property editor schema (Unit 14), shared by the admin form (React Hook Form + zodResolver) and
// the server actions in lib/actions/property.ts. Input = what the form holds (strings from the
// inputs); output = what the database gets (kobo BigInt, numbers, Date, nulls).
// Fields that don't apply are cleared here, so hidden fields never save stale values:
// beds/baths for land, price period outside rentals, completion date outside off-plan,
// project status without "showcase".
import { z } from "zod";
import { koboFromNaira } from "@/lib/format";
import { ALT_MAX, MAX_PHOTOS } from "@/lib/property-photos";

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
    if (!v.priceOnRequest && v.price !== "") {
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
    if (showsPricePeriod(v.listingType) && v.pricePeriod === "ONE_OFF") {
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
    const priceKobo =
      v.price === ""
        ? null
        : (() => {
            try {
              return koboFromNaira(v.price);
            } catch {
              return null;
            }
          })();
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
      pricePeriod: showsPricePeriod(v.listingType) ? v.pricePeriod : ("ONE_OFF" as const),
      priceOnRequest: v.priceOnRequest,
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
  photos: "Photos",
};

// ---- Action inputs ----

export const propertyIdSchema = z.string().trim().min(1).max(40);
