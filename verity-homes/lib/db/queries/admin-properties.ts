// Admin property reads (Unit 14). Every function calls requireAdmin() itself and is not cached:
// the admin sees drafts and the private address, always live.
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { nairaInputFromKobo } from "@/lib/format";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  ADMIN_TYPE_PARAM,
  type AdminPropertyFilters,
} from "@/lib/validation/admin-property-filters";
import type { PropertyFormValues } from "@/lib/validation/property";

export const ADMIN_PAGE_SIZE = 20;

export type AdminPropertyRow = {
  id: string;
  slug: string;
  title: string;
  area: string;
  city: string;
  listingType: "SALE" | "RENT" | "LAND" | "OFF_PLAN";
  priceKobo: bigint | null;
  pricePeriod: "ONE_OFF" | "PER_YEAR" | "PER_MONTH";
  priceOnRequest: boolean;
  status: "DRAFT" | "PUBLISHED";
  featured: boolean;
  showcase: boolean;
  updatedAt: Date;
  cover: { url: string; alt: string } | null;
};

export type AdminPropertyList = {
  rows: AdminPropertyRow[];
  total: number;
  /** Per status tab, within the current search and type filter. */
  counts: { all: number; published: number; draft: number };
  page: number;
  pageSize: number;
};

export async function listAdminProperties(f: AdminPropertyFilters): Promise<AdminPropertyList> {
  await requireAdmin();
  const base: Prisma.PropertyWhereInput = {
    ...(f.type ? { listingType: ADMIN_TYPE_PARAM[f.type] } : {}),
    ...(f.q
      ? {
          OR: [
            { title: { contains: f.q, mode: "insensitive" } },
            { area: { contains: f.q, mode: "insensitive" } },
            { city: { contains: f.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.PropertyWhereInput =
    f.status === "all"
      ? base
      : { ...base, status: f.status === "published" ? "PUBLISHED" : "DRAFT" };
  const [rows, all, published, draft] = await Promise.all([
    db.property.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        title: true,
        area: true,
        city: true,
        listingType: true,
        priceKobo: true,
        pricePeriod: true,
        priceOnRequest: true,
        status: true,
        featured: true,
        showcase: true,
        updatedAt: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
      },
    }),
    db.property.count({ where: base }),
    db.property.count({ where: { ...base, status: "PUBLISHED" } }),
    db.property.count({ where: { ...base, status: "DRAFT" } }),
  ]);
  const counts = { all, published, draft };
  return {
    rows: rows.map(({ images, ...r }) => ({ ...r, cover: images[0] ?? null })),
    total: counts[f.status === "all" ? "all" : f.status],
    counts,
    page: f.page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

function nearbyValues(json: Prisma.JsonValue | null): PropertyFormValues["nearby"] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((n) => {
    if (!n || typeof n !== "object" || Array.isArray(n)) return [];
    const place = typeof n.place === "string" ? n.place : "";
    const minutes = typeof n.minutes === "number" ? String(n.minutes) : "";
    return place ? [{ place, minutes }] : [];
  });
}

const str = (n: number | null) => (n === null ? "" : String(n));

export type AdminPropertyEditor = {
  id: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  images: { id: string; url: string; alt: string }[];
  values: PropertyFormValues;
};

/** One property for the editor, including the private address. null → 404. */
export async function getAdminProperty(id: string): Promise<AdminPropertyEditor | null> {
  await requireAdmin();
  const p = await db.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true } },
      documents: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    publishedAt: p.publishedAt,
    images: p.images,
    values: {
      title: p.title,
      slug: p.slug,
      listingType: p.listingType,
      propertyType: p.propertyType,
      price: nairaInputFromKobo(p.priceKobo),
      pricePeriod: p.pricePeriod,
      priceOnRequest: p.priceOnRequest,
      bedrooms: str(p.bedrooms),
      bathrooms: str(p.bathrooms),
      sizeSqm: str(p.sizeSqm),
      parkingSpaces: str(p.parkingSpaces),
      titleDocument: p.titleDocument ?? "",
      completionDate: p.completionDate ? p.completionDate.toISOString().slice(0, 7) : "",
      description: p.description,
      features: p.features,
      documents: p.documents.map((d) => ({ id: d.id, name: d.name, verified: d.verified })),
      address: p.address ?? "",
      area: p.area,
      city: p.city,
      latitude: p.latitude === null ? "" : p.latitude.toString(),
      longitude: p.longitude === null ? "" : p.longitude.toString(),
      showExactLocation: p.showExactLocation,
      nearby: nearbyValues(p.nearby),
      featured: p.featured,
      showcase: p.showcase,
      projectStatus: p.projectStatus ?? "",
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
    },
  };
}
