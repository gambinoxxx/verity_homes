// Admin reads for testimonials, partners and newsletter subscribers (Unit 19b). Each calls
// requireAdmin() itself and is not cached — the admin sees drafts, always live.
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PartnerFormValues, TestimonialFormValues } from "@/lib/validation/trust";

type Status = "DRAFT" | "PUBLISHED";

// ---- Testimonials ----

export type AdminTestimonialRow = {
  id: string;
  name: string;
  serviceUsed: string;
  rating: number | null;
  status: Status;
  consentConfirmed: boolean;
  avatarUrl: string | null;
};

export async function listAdminTestimonials(): Promise<AdminTestimonialRow[]> {
  await requireAdmin();
  return db.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      serviceUsed: true,
      rating: true,
      status: true,
      consentConfirmed: true,
      avatarUrl: true,
    },
  });
}

export type AdminTestimonialEditor = { id: string; status: Status; values: TestimonialFormValues };

export async function getAdminTestimonial(id: string): Promise<AdminTestimonialEditor | null> {
  await requireAdmin();
  if (!/^[a-z0-9]{8,40}$/.test(id)) return null;
  const t = await db.testimonial.findUnique({ where: { id } });
  if (!t) return null;
  return {
    id: t.id,
    status: t.status,
    values: {
      name: t.name,
      serviceUsed: t.serviceUsed,
      quote: t.quote,
      rating: t.rating === null ? "" : String(t.rating),
      avatarUrl: t.avatarUrl ?? "",
      avatarPathname: t.avatarPathname ?? "",
      consentConfirmed: t.consentConfirmed,
    },
  };
}

export async function testimonialExists(id: string): Promise<boolean> {
  await requireAdmin();
  return (await db.testimonial.findUnique({ where: { id }, select: { id: true } })) !== null;
}

// ---- Partners ----

export type AdminPartnerRow = {
  id: string;
  name: string;
  website: string | null;
  logoUrl: string | null;
  status: Status;
  consentConfirmed: boolean;
};

export async function listAdminPartners(): Promise<AdminPartnerRow[]> {
  await requireAdmin();
  return db.partner.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      website: true,
      logoUrl: true,
      status: true,
      consentConfirmed: true,
    },
  });
}

export type AdminPartnerEditor = { id: string; status: Status; values: PartnerFormValues };

export async function getAdminPartner(id: string): Promise<AdminPartnerEditor | null> {
  await requireAdmin();
  if (!/^[a-z0-9]{8,40}$/.test(id)) return null;
  const p = await db.partner.findUnique({ where: { id } });
  if (!p) return null;
  return {
    id: p.id,
    status: p.status,
    values: {
      name: p.name,
      website: p.website ?? "",
      logoUrl: p.logoUrl ?? "",
      logoPathname: p.logoPathname ?? "",
      consentConfirmed: p.consentConfirmed,
    },
  };
}

export async function partnerExists(id: string): Promise<boolean> {
  await requireAdmin();
  return (await db.partner.findUnique({ where: { id }, select: { id: true } })) !== null;
}

// ---- Subscribers ----

export const SUBSCRIBERS_PAGE_SIZE = 50;

export type SubscriberRow = { id: string; email: string; createdAt: Date };
export type SubscriberList = {
  rows: SubscriberRow[];
  total: number;
  page: number;
  pageSize: number;
};

const subscriberWhere = (q: string): Prisma.SubscriberWhereInput =>
  q ? { email: { contains: q, mode: "insensitive" } } : {};

/** Newest first, 50 a page; a page past the end is clamped to the last page. */
export async function listAdminSubscribers(f: {
  q: string;
  page: number;
}): Promise<SubscriberList> {
  await requireAdmin();
  const where = subscriberWhere(f.q);
  const total = await db.subscriber.count({ where });
  const pages = Math.max(1, Math.ceil(total / SUBSCRIBERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page), pages);
  const rows = await db.subscriber.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * SUBSCRIBERS_PAGE_SIZE,
    take: SUBSCRIBERS_PAGE_SIZE,
    select: { id: true, email: true, createdAt: true },
  });
  return { rows, total, page, pageSize: SUBSCRIBERS_PAGE_SIZE };
}

/** Every subscriber matching the search, newest first (CSV export). */
export async function exportAdminSubscribers(q: string): Promise<SubscriberRow[]> {
  await requireAdmin();
  return db.subscriber.findMany({
    where: subscriberWhere(q),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, email: true, createdAt: true },
  });
}
