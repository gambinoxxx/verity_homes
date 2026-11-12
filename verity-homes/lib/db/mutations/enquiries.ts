// Writes and lookups for the public enquiry and newsletter actions (lib/actions/*).
import "server-only";
import { db } from "@/lib/db/client";
import type { EnquiryInterest, EnquirySource } from "@/lib/generated/prisma/client";

/** Enquiries saved from this IP hash since `since` (rate limit, counted in the database). */
export function countEnquiriesSince(ipHash: string, since: Date): Promise<number> {
  return db.enquiry.count({ where: { ipHash, createdAt: { gte: since } } });
}

/** The property, if it exists and is published (title/slug for the email). */
export function findPublishedPropertyRef(id: string) {
  return db.property.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
  });
}

/** The investment plan, if it exists and is published. */
export function findPublishedPlanRef(id: string) {
  return db.investmentPlan.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { id: true, name: true },
  });
}

export type NewEnquiry = {
  name: string;
  phone: string;
  email: string | null;
  interest: EnquiryInterest;
  message: string;
  source: EnquirySource;
  propertyId: string | null;
  planId: string | null;
  wantsInspection: boolean;
  amountKobo: bigint | null;
  ipHash: string;
};

export function saveEnquiry(data: NewEnquiry) {
  return db.enquiry.create({ data, select: { id: true, createdAt: true } });
}

export async function markEnquiryEmailSent(id: string): Promise<void> {
  await db.enquiry.update({ where: { id }, data: { emailSentAt: new Date() } });
}

/** Adds the email to the newsletter list; a repeat sign-up is not an error. */
export async function upsertSubscriber(email: string): Promise<void> {
  await db.subscriber.upsert({ where: { email }, create: { email }, update: {} });
}
