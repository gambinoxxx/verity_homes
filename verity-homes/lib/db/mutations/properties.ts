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
    developerName: d.developerName,
    paymentPlan: d.paymentPlan,
    offerNote: d.offerNote,
    offerEndsAt: d.offerEndsAt,
    termsNote: d.termsNote,
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
      plots: { create: d.plots.map(plotColumns) },
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
): Promise<{ id: string; slug: string; status: string; removedPhotoUrls: string[] }> {
  return db.$transaction(async (tx) => {
    const removedPhotoUrls = d.photos ? await syncPhotos(tx, id, d.photos) : [];
    await syncPlots(tx, id, d.plots);
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
    return { ...updated, removedPhotoUrls };
  });
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** A plot's columns (everything but its id). */
function plotColumns(p: PropertyData["plots"][number]) {
  return {
    label: p.label,
    sizeSqm: p.sizeSqm,
    priceKobo: p.priceKobo,
    initialDepositKobo: p.initialDepositKobo,
    suitableFor: p.suitableFor,
    sortOrder: p.sortOrder,
  };
}

/**
 * Plot options as the editor left them (Unit 17b). Rows keep their ids — enquiries point at a
 * plot (plotId) — so existing plots are updated in place, new ones created, and plots no longer
 * in the list deleted (their enquiries keep the property link; plotId becomes null).
 */
async function syncPlots(tx: Tx, propertyId: string, plots: PropertyData["plots"]) {
  const existing = await tx.propertyPlot.findMany({ where: { propertyId }, select: { id: true } });
  const keep = new Set(plots.flatMap((p) => (p.id ? [p.id] : [])));
  const gone = existing.filter((e) => !keep.has(e.id)).map((e) => e.id);
  if (gone.length) await tx.propertyPlot.deleteMany({ where: { propertyId, id: { in: gone } } });
  const known = new Set(existing.map((e) => e.id));
  for (const p of plots) {
    if (p.id && known.has(p.id)) {
      await tx.propertyPlot.update({ where: { id: p.id }, data: plotColumns(p) });
    } else {
      await tx.propertyPlot.create({ data: { ...plotColumns(p), propertyId } });
    }
  }
}

/**
 * Photos as the editor left them: `removedIds` are deleted (their URLs returned so the caller
 * removes the Blob files after the commit); `items` get their new order and alt text. Photos
 * not mentioned (e.g. uploaded in another tab) are kept, after the listed ones.
 */
async function syncPhotos(
  tx: Tx,
  propertyId: string,
  photos: NonNullable<PropertyData["photos"]>,
): Promise<string[]> {
  const existing = await tx.propertyImage.findMany({
    where: { propertyId },
    select: { id: true, url: true },
    orderBy: { sortOrder: "asc" },
  });
  const removedIds = new Set(photos.removedIds);
  const removed = existing.filter((e) => removedIds.has(e.id));
  if (removed.length) {
    await tx.propertyImage.deleteMany({
      where: { propertyId, id: { in: removed.map((r) => r.id) } },
    });
  }
  const listed = new Map(photos.items.map((p, i) => [p.id, { alt: p.alt, sortOrder: i }]));
  let next = photos.items.length;
  for (const e of existing) {
    if (removedIds.has(e.id)) continue;
    const p = listed.get(e.id);
    await tx.propertyImage.update({
      where: { id: e.id },
      data: p ? { sortOrder: p.sortOrder, alt: p.alt } : { sortOrder: next++ },
    });
  }
  return removed.map((r) => r.url);
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

/**
 * Adds an uploaded photo at the end (sortOrder = last + 1), up to `max` per property.
 * null → the property is gone or already full.
 */
export async function insertPropertyPhoto(
  propertyId: string,
  photo: { url: string; pathname: string; width: number; height: number; alt: string },
  max: number,
) {
  return db.$transaction(async (tx) => {
    const property = await tx.property.findUnique({
      where: { id: propertyId },
      select: { slug: true, _count: { select: { images: true } } },
    });
    if (!property || property._count.images >= max) return null;
    const last = await tx.propertyImage.findFirst({
      where: { propertyId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const row = await tx.propertyImage.create({
      data: { propertyId, ...photo, sortOrder: (last?.sortOrder ?? -1) + 1 },
      select: { id: true, url: true, alt: true, width: true, height: true },
    });
    return { photo: row, slug: property.slug };
  });
}
