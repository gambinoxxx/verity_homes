// Public property queries. Invariants: PUBLISHED rows only, and `address` is never selected.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db/client";
import type {
  ListingType,
  Prisma,
  PricePeriod,
  ProjectStatus,
  PropertyType,
  TitleDocument,
} from "@/lib/generated/prisma/client";
import { formatPrice } from "@/lib/format";
import {
  optionalDecimalToNumber,
  optionalKoboToNumber,
  parseNearby,
  type NearbyPlace,
} from "./convert";

export const PROPERTIES_PER_PAGE = 12;
const PUBLISHED = { status: "PUBLISHED" } as const;

const coverImage = {
  orderBy: { sortOrder: "asc" },
  take: 1,
  select: { url: true, alt: true, width: true, height: true },
} as const satisfies Prisma.Property$imagesArgs;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  listingType: true,
  propertyType: true,
  projectStatus: true,
  priceKobo: true,
  pricePeriod: true,
  priceOnRequest: true,
  bedrooms: true,
  bathrooms: true,
  sizeSqm: true,
  titleDocument: true,
  area: true,
  city: true,
  images: coverImage,
} as const satisfies Prisma.PropertySelect;

// Deliberately has no `address` key.
const detailSelect = {
  ...cardSelect,
  parkingSpaces: true,
  completionDate: true,
  description: true,
  features: true,
  latitude: true,
  longitude: true,
  showExactLocation: true,
  nearby: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  updatedAt: true,
  images: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, url: true, alt: true, width: true, height: true },
  },
  documents: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, verified: true } },
} as const satisfies Prisma.PropertySelect;

type CardRow = Prisma.PropertyGetPayload<{ select: typeof cardSelect }>;
type DetailRow = Prisma.PropertyGetPayload<{ select: typeof detailSelect }>;

export type PropertyImageView = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type PropertyCard = {
  id: string;
  slug: string;
  title: string;
  listingType: ListingType;
  propertyType: PropertyType;
  projectStatus: ProjectStatus | null;
  priceKobo: number | null;
  pricePeriod: PricePeriod;
  priceOnRequest: boolean;
  priceLabel: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  titleDocument: TitleDocument | null;
  area: string;
  city: string;
  cover: PropertyImageView | null;
};

export type PropertyDetail = Omit<PropertyCard, "cover"> & {
  parkingSpaces: number | null;
  completionDate: Date | null;
  description: string;
  features: string[];
  latitude: number | null;
  longitude: number | null;
  showExactLocation: boolean;
  nearby: NearbyPlace[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  images: (PropertyImageView & { id: string })[];
  documents: { id: string; name: string; verified: boolean }[];
};

function toCard(row: CardRow): PropertyCard {
  const { images, priceKobo, ...rest } = row;
  return {
    ...rest,
    priceKobo: optionalKoboToNumber(priceKobo),
    priceLabel: formatPrice(row),
    cover: images[0] ?? null,
  };
}

function toDetail(row: DetailRow): PropertyDetail {
  const { images, priceKobo, latitude, longitude, nearby, ...rest } = row;
  return {
    ...rest,
    priceKobo: optionalKoboToNumber(priceKobo),
    priceLabel: formatPrice(row),
    latitude: optionalDecimalToNumber(latitude),
    longitude: optionalDecimalToNumber(longitude),
    nearby: parseNearby(nearby),
    images,
  };
}

const newestFirst = [
  { publishedAt: "desc" },
  { createdAt: "desc" },
] as const satisfies Prisma.PropertyOrderByWithRelationInput[];

/** Cache tag for public property reads. Admin property actions (Unit 14) call updateTag(it). */
export const PROPERTIES_TAG = "properties";

/** Home page grid. Cached until a property changes (tag "properties"). */
export async function getFeaturedProperties(limit = 6): Promise<PropertyCard[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const rows = await db.property.findMany({
    where: { ...PUBLISHED, featured: true },
    orderBy: newestFirst,
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Home "Signature projects" showcase. Cached until a property changes (tag "properties"). */
export async function getShowcaseProperties(limit = 4): Promise<PropertyCard[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const rows = await db.property.findMany({
    where: { ...PUBLISHED, showcase: true },
    orderBy: newestFirst,
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** URL filter values. Unit 5 parses the query string into this shape with Zod. */
export type PropertyFilters = {
  type?: "sale" | "rent" | "land" | "offplan";
  q?: string;
  area?: string;
  ptype?: PropertyType;
  /** Naira, not kobo. */
  min?: number;
  /** Naira, not kobo. */
  max?: number;
  /** Minimum bedrooms (5 means 5+). */
  beds?: number;
  title?: TitleDocument[];
  sort?: "newest" | "price-asc" | "price-desc";
  page?: number;
};

const LISTING_BY_PARAM: Record<NonNullable<PropertyFilters["type"]>, ListingType> = {
  sale: "SALE",
  rent: "RENT",
  land: "LAND",
  offplan: "OFF_PLAN",
};

function buildWhere(f: PropertyFilters): Prisma.PropertyWhereInput {
  const and: Prisma.PropertyWhereInput[] = [PUBLISHED];
  if (f.type) and.push({ listingType: LISTING_BY_PARAM[f.type] });
  if (f.ptype) and.push({ propertyType: f.ptype });
  if (f.area) and.push({ area: { contains: f.area, mode: "insensitive" } });
  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { area: { contains: f.q, mode: "insensitive" } },
        { city: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.beds != null && f.beds > 0) and.push({ bedrooms: { gte: f.beds } });
  if (f.title && f.title.length > 0) and.push({ titleDocument: { in: f.title } });
  if (f.min != null || f.max != null) {
    and.push({
      priceOnRequest: false,
      priceKobo: {
        ...(f.min != null ? { gte: BigInt(Math.round(f.min)) * 100n } : {}),
        ...(f.max != null ? { lte: BigInt(Math.round(f.max)) * 100n } : {}),
      },
    });
  }
  return { AND: and };
}

function buildOrder(sort: PropertyFilters["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  if (sort === "price-asc") return [{ priceKobo: { sort: "asc", nulls: "last" } }, ...newestFirst];
  if (sort === "price-desc")
    return [{ priceKobo: { sort: "desc", nulls: "last" } }, ...newestFirst];
  return [...newestFirst];
}

export type PropertyPage = {
  items: PropertyCard[];
  total: number;
  page: number;
  pageCount: number;
};

/**
 * One page of published properties for /properties. Cached (tag "properties"); the filters
 * object is part of the cache key, so pass it already normalised (parsePropertyFilters).
 * A page past the end is clamped to the last page.
 */
export async function listProperties(filters: PropertyFilters = {}): Promise<PropertyPage> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const where = buildWhere(filters);
  const total = await db.property.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PROPERTIES_PER_PAGE));
  const page = Math.min(pageCount, Math.max(1, Math.floor(filters.page ?? 1)));
  const rows = total
    ? await db.property.findMany({
        where,
        orderBy: buildOrder(filters.sort),
        skip: (page - 1) * PROPERTIES_PER_PAGE,
        take: PROPERTIES_PER_PAGE,
        select: cardSelect,
      })
    : [];
  return { items: rows.map(toCard), total, page, pageCount };
}

/** Distinct areas of published properties, A–Z, for the area dropdown. Cached (tag "properties"). */
export async function getPublishedAreas(): Promise<string[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const rows = await db.property.findMany({
    where: PUBLISHED,
    distinct: ["area"],
    orderBy: { area: "asc" },
    select: { area: true },
  });
  return rows.map((r) => r.area);
}

/** Every published slug, for generateStaticParams. Cached (tag "properties"). */
export async function getPublishedPropertySlugs(): Promise<string[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const rows = await db.property.findMany({
    where: PUBLISHED,
    orderBy: newestFirst,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/**
 * Published property by slug, or null. Never selects the private `address`.
 * Cached (tag "properties") so the detail page can prerender and answer 404s with a real status.
 */
export async function getPropertyBySlug(slug: string): Promise<PropertyDetail | null> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const row = await db.property.findFirst({ where: { ...PUBLISHED, slug }, select: detailSelect });
  return row ? toDetail(row) : null;
}

/**
 * The current slug for an old property slug (SlugRedirect), or null. Cached with the
 * "properties" tag: slug changes happen in the property actions, which update that tag.
 */
export async function getPropertyRedirect(fromSlug: string): Promise<string | null> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const row = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "PROPERTY", fromSlug } },
    select: { toSlug: true },
  });
  return row?.toSlug ?? null;
}

/** Same listing type, excluding the property itself. Cached (tag "properties"). */
export async function getSimilarProperties(
  p: { id: string; listingType: ListingType },
  limit = 3,
): Promise<PropertyCard[]> {
  "use cache";
  cacheTag(PROPERTIES_TAG);
  cacheLife("max");
  const rows = await db.property.findMany({
    where: { ...PUBLISHED, listingType: p.listingType, id: { not: p.id } },
    orderBy: newestFirst,
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export type SlugStatus =
  { kind: "published" } | { kind: "redirect"; to: string } | { kind: "missing" };

/**
 * Cheap existence check for proxy.ts (two indexed lookups, no content). With Cache Components
 * the page streams its shell first, so a 404 / 308 decided inside the page would keep a 200;
 * the proxy answers with the real status before rendering starts.
 */
export async function resolvePropertySlug(slug: string): Promise<SlugStatus> {
  const published = await db.property.findFirst({
    where: { ...PUBLISHED, slug },
    select: { id: true },
  });
  if (published) return { kind: "published" };
  const redirect = await db.slugRedirect.findUnique({
    where: { entity_fromSlug: { entity: "PROPERTY", fromSlug: slug } },
    select: { toSlug: true },
  });
  if (redirect && redirect.toSlug !== slug) return { kind: "redirect", to: redirect.toSlug };
  return { kind: "missing" };
}
