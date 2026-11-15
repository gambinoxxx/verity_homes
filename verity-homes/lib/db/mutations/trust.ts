// Testimonial, partner and subscriber writes (Unit 19b), called only by the actions after Zod +
// requireAdmin().
import "server-only";
import { db } from "@/lib/db/client";
import type { PartnerData, TestimonialData } from "@/lib/validation/trust";

type Status = "DRAFT" | "PUBLISHED";

// ---- Testimonials ----

export function findTestimonialState(id: string) {
  return db.testimonial.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, consentConfirmed: true, avatarUrl: true },
  });
}

export async function insertTestimonial(d: TestimonialData) {
  return db.$transaction(async (tx) => {
    const last = await tx.testimonial.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    // A new testimonial has no avatar yet (the upload needs its id).
    return tx.testimonial.create({
      data: {
        ...d,
        avatarUrl: null,
        avatarPathname: null,
        status: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
      select: { id: true },
    });
  });
}

/**
 * Saves the editor. Without consent a published testimonial goes back to draft in the same
 * write (unticking consent unpublishes it).
 */
export function saveTestimonial(id: string, d: TestimonialData, status: Status) {
  return db.testimonial.update({
    where: { id },
    data: { ...d, status: d.consentConfirmed ? status : "DRAFT" },
    select: { id: true, status: true },
  });
}

export function setTestimonialStatus(id: string, status: Status) {
  return db.testimonial.update({ where: { id }, data: { status }, select: { id: true } });
}

export async function deleteTestimonialRow(id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.testimonial.findUnique({
      where: { id },
      select: { name: true, avatarUrl: true },
    });
    if (!row) return null;
    await tx.testimonial.delete({ where: { id } });
    return row;
  });
}

// ---- Partners ----

export function findPartnerState(id: string) {
  return db.partner.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, consentConfirmed: true, logoUrl: true },
  });
}

export async function insertPartner(d: PartnerData) {
  return db.$transaction(async (tx) => {
    const last = await tx.partner.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return tx.partner.create({
      data: {
        ...d,
        logoUrl: null,
        logoPathname: null,
        status: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
      select: { id: true },
    });
  });
}

/** Without permission a published partner goes back to draft in the same write. */
export function savePartner(id: string, d: PartnerData, status: Status) {
  return db.partner.update({
    where: { id },
    data: { ...d, status: d.consentConfirmed ? status : "DRAFT" },
    select: { id: true, status: true },
  });
}

export function setPartnerStatus(id: string, status: Status) {
  return db.partner.update({ where: { id }, data: { status }, select: { id: true } });
}

export async function deletePartnerRow(id: string) {
  return db.$transaction(async (tx) => {
    const row = await tx.partner.findUnique({
      where: { id },
      select: { name: true, logoUrl: true },
    });
    if (!row) return null;
    await tx.partner.delete({ where: { id } });
    return row;
  });
}

// ---- Reorder: sortOrder = position in `ids`; false if any id isn't in that list ----

export function reorderTestimonialRows(ids: string[]): Promise<boolean> {
  return db.$transaction(async (tx) => {
    if ((await tx.testimonial.count({ where: { id: { in: ids } } })) !== ids.length) return false;
    for (const [i, id] of ids.entries())
      await tx.testimonial.update({ where: { id }, data: { sortOrder: i } });
    return true;
  });
}

export function reorderPartnerRows(ids: string[]): Promise<boolean> {
  return db.$transaction(async (tx) => {
    if ((await tx.partner.count({ where: { id: { in: ids } } })) !== ids.length) return false;
    for (const [i, id] of ids.entries())
      await tx.partner.update({ where: { id }, data: { sortOrder: i } });
    return true;
  });
}

// ---- Subscribers ----

export async function deleteSubscriberRow(id: string) {
  const row = await db.subscriber.findUnique({ where: { id }, select: { email: true } });
  if (!row) return null;
  await db.subscriber.delete({ where: { id } });
  return row;
}
