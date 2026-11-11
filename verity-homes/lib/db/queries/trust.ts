// Testimonials and partners: public only when PUBLISHED *and* consentConfirmed.
import "server-only";
import { db } from "@/lib/db/client";

const PUBLIC = { status: "PUBLISHED", consentConfirmed: true } as const;

export type TestimonialView = {
  id: string;
  name: string;
  serviceUsed: string;
  quote: string;
  rating: number | null;
  avatarUrl: string | null;
};

export async function getPublishedTestimonials(): Promise<TestimonialView[]> {
  return db.testimonial.findMany({
    where: PUBLIC,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, serviceUsed: true, quote: true, rating: true, avatarUrl: true },
  });
}

export type PartnerView = {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
};

export async function getPublishedPartners(): Promise<PartnerView[]> {
  return db.partner.findMany({
    where: PUBLIC,
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, logoUrl: true, website: true },
  });
}
