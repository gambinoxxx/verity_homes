// Admin read of the settings row (Unit 19a): calls requireAdmin() and is not cached, so the
// form always opens on what is saved. The private officeAddress is included (admin only).
import "server-only";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import type { SettingsFormValues } from "@/lib/validation/settings";

export type AdminSettings = {
  values: SettingsFormValues;
  privacyReviewedAt: Date | null;
  updatedAt: Date | null;
};

const s = (v: string | null | undefined) => v ?? "";

export async function getAdminSettings(): Promise<AdminSettings> {
  await requireAdmin();
  const r = await db.siteSettings.findUnique({ where: { id: 1 } });
  return {
    values: {
      phone: s(r?.phone),
      whatsapp: s(r?.whatsapp),
      email: s(r?.email),
      officeArea: r?.officeArea ?? "Onipanu, Lagos State",
      officeAddress: s(r?.officeAddress),
      showFullAddress: r?.showFullAddress ?? false,
      mapQuery: r?.mapQuery ?? "Onipanu, Lagos",
      companyName: r?.companyName ?? "Verity Homes and Properties Ltd",
      rcNumber: r?.rcNumber ?? "9971213",
      openingHours: s(r?.openingHours),
      instagram: s(r?.instagram),
      facebook: s(r?.facebook),
      x: s(r?.x),
      linkedin: s(r?.linkedin),
      ceoBio: s(r?.ceoBio),
      ceoPromise: s(r?.ceoPromise),
      companyStory: s(r?.companyStory),
    },
    privacyReviewedAt: r?.privacyReviewedAt ?? null,
    updatedAt: r?.updatedAt ?? null,
  };
}
