// Testimonials and partners: public only when PUBLISHED *and* consentConfirmed.
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
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

/** Cache tag for testimonial reads. The admin testimonial actions (Unit 19) call updateTag(it). */
export const TESTIMONIALS_TAG = "testimonials";
/** Cache tag for partner reads. The admin partner actions (Unit 19) call updateTag(it). */
export const PARTNERS_TAG = "partners";

export async function getPublishedTestimonials(): Promise<TestimonialView[]> {
  "use cache";
  cacheTag(TESTIMONIALS_TAG);
  cacheLife("max");
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
  "use cache";
  cacheTag(PARTNERS_TAG);
  cacheLife("max");
  return db.partner.findMany({
    where: PUBLIC,
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, logoUrl: true, website: true },
  });
}
