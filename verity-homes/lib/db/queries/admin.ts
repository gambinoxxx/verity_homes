// Admin dashboard reads (Unit 13). Every function calls requireAdmin() itself (drafts and
// enquiries are admin-only) and is NOT cached: the admin always sees live numbers. Callers are
// Server Components inside the admin layout's <Suspense>.
import "server-only";
import { type EnquiryStatus, SAMPLE_PREFIX, type SetupStatus } from "@/lib/admin-dashboard";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import type { INTEREST_LABEL } from "@/lib/format";
import { PRIVACY_REVIEWED } from "@/lib/privacy";

export type DashboardStats = {
  newEnquiries: number;
  publishedProperties: number;
  featuredProperties: number;
  draftProperties: number;
  publishedPlans: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const [newEnquiries, publishedProperties, featuredProperties, draftProperties, publishedPlans] =
    await Promise.all([
      db.enquiry.count({ where: { status: "NEW" } }),
      db.property.count({ where: { status: "PUBLISHED" } }),
      db.property.count({ where: { status: "PUBLISHED", featured: true } }),
      db.property.count({ where: { status: "DRAFT" } }),
      db.investmentPlan.count({ where: { status: "PUBLISHED" } }),
    ]);
  return { newEnquiries, publishedProperties, featuredProperties, draftProperties, publishedPlans };
}

/** Sidebar badge on "Enquiries". */
export async function getNewEnquiryCount(): Promise<number> {
  await requireAdmin();
  return db.enquiry.count({ where: { status: "NEW" } });
}

export type LatestEnquiry = {
  id: string;
  name: string;
  interest: keyof typeof INTEREST_LABEL;
  status: EnquiryStatus;
  propertyTitle: string | null;
  planName: string | null;
  createdAt: Date;
};

/** Newest first (ties broken by id so the order is stable). */
export async function getLatestEnquiries(limit = 5): Promise<LatestEnquiry[]> {
  await requireAdmin();
  const rows = await db.enquiry.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      interest: true,
      status: true,
      createdAt: true,
      property: { select: { title: true } },
      plan: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    interest: r.interest,
    status: r.status,
    propertyTitle: r.property?.title ?? null,
    planName: r.plan?.name ?? null,
    createdAt: r.createdAt,
  }));
}

/** Facts behind the setup checklist (lib/admin-dashboard.ts setupChecklist). */
export async function getSetupStatus(): Promise<SetupStatus> {
  await requireAdmin();
  const [settings, realPublishedProperties] = await Promise.all([
    db.siteSettings.findUnique({ where: { id: 1 }, select: { whatsapp: true, email: true } }),
    db.property.count({
      where: { status: "PUBLISHED", NOT: { title: { startsWith: SAMPLE_PREFIX } } },
    }),
  ]);
  return {
    whatsappSet: Boolean(settings?.whatsapp?.trim()),
    emailSet: Boolean(settings?.email?.trim()),
    realPublishedProperties,
    privacyReviewed: PRIVACY_REVIEWED,
  };
}
