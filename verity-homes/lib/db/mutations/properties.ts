// Admin property writes (Unit 14), called only by lib/actions/property.ts after Zod +
// requireAdmin(). Slug redirects keep shared links working when a published slug changes.
import "server-only";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PropertyData } from "@/lib/validation/property";

/** True if another property already uses this slug. */
export async function isPropertySlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const row = await db.property.findFirst({
    where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return row !== null;
}

/** Columns of the Property row (relations are written separately). */
function columns(d: PropertyData) {
  return {
    title: d.title,
    listingType: d.listingType,
    propertyType: d.propertyType,
    priceKobo: d.priceKobo,
    pricePeriod: d.pricePeriod,
    priceOnRequest: d.priceOnRequest,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    sizeSqm: d.sizeSqm,
    parkingSpaces: d.parkingSpaces,
    titleDocument: d.titleDocument,
    completionDate: d.completionDate,
    description: d.description,
    features: d.features,
    address: d.address,
    area: d.area,
    city: d.city,
    latitude: d.latitude,
    longitude: d.longitude,
    showExactLocation: d.showExactLocation,
    nearby: d.nearby.length ? (d.nearby as Prisma.InputJsonValue) : ([] as Prisma.InputJsonValue),
    featured: d.featured,
    showcase: d.showcase,
    projectStatus: d.projectStatus,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
  } satisfies Prisma.PropertyUncheckedUpdateInput;
}

function documentRows(d: PropertyData) {
  return d.documents.map((doc) => ({
    name: doc.name,
    verified: doc.verified,
    sortOrder: doc.sortOrder,
  }));
}

export async function insertProperty(d: PropertyData, slug: string, createdBy: string) {
  return db.property.create({
    data: {
      ...columns(d),
      slug,
      status: "DRAFT",
      createdBy,
      documents: { create: documentRows(d) },
    },
    select: { id: true, slug: true, status: true },
  });
}

export function findPropertyState(id: string) {
  return db.property.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      status: true,
      title: true,
      area: true,
      priceKobo: true,
      priceOnRequest: true,
      publishedAt: true,
    },
  });
}

/**
 * Saves the editor. If a PUBLISHED property's slug changes, old links get a SlugRedirect
 * (existing redirects to the old slug are re-pointed, so there are no chains), and a redirect
 * from the new slug is dropped because that address is live again.
 */
export async function savePropertyEdits(
  id: string,
  d: PropertyData,
  slug: string,
  previous: { slug: string; status: "DRAFT" | "PUBLISHED" },
) {
  return db.$transaction(async (tx) => {
    const updated = await tx.property.update({
      where: { id },
      data: {
        ...columns(d),
        slug,
        documents: { deleteMany: {}, create: documentRows(d) },
      },
      select: { id: true, slug: true, status: true },
    });
    if (slug !== previous.slug) {
      await tx.slugRedirect.deleteMany({ where: { entity: "PROPERTY", fromSlug: slug } });
      // Older links that pointed at the old slug follow the property to its new one.
      await tx.slugRedirect.updateMany({
        where: { entity: "PROPERTY", toSlug: previous.slug },
        data: { toSlug: slug },
      });
      if (previous.status === "PUBLISHED") {
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: "PROPERTY", fromSlug: previous.slug } },
          create: { entity: "PROPERTY", fromSlug: previous.slug, toSlug: slug },
          update: { toSlug: slug },
        });
      }
    }
    return updated;
  });
}

export function setPropertyStatus(id: string, status: "DRAFT" | "PUBLISHED", publishedAt?: Date) {
  return db.property.update({
    where: { id },
    data: { status, ...(publishedAt ? { publishedAt } : {}) },
    select: { id: true, slug: true, status: true },
  });
}

/**
 * Deletes the property (images and documents cascade) and the redirects that pointed at it, so
 * old links 404 instead of redirecting to a missing page. Returns the image URLs for Blob
 * clean-up.
 */
export async function deletePropertyRow(id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.property.findUnique({
      where: { id },
      select: { slug: true, title: true, images: { select: { url: true } } },
    });
    if (!row) return null;
    await tx.property.delete({ where: { id } });
    await tx.slugRedirect.deleteMany({ where: { entity: "PROPERTY", toSlug: row.slug } });
    return { slug: row.slug, title: row.title, imageUrls: row.images.map((i) => i.url) };
  });
}
