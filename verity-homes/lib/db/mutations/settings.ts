// Settings writes (Unit 19a), called only by lib/actions/settings.ts after Zod + requireAdmin().
// The table has one row (id = 1); upsert creates it if the seed never ran.
import "server-only";
import { db } from "@/lib/db/client";
import type { SettingsData } from "@/lib/validation/settings";

export function saveSettings(d: SettingsData) {
  return db.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...d },
    update: d,
    select: { updatedAt: true },
  });
}

/** Marks the privacy notice reviewed (now) or back to draft (null). */
export function setPrivacyReviewedAt(at: Date | null) {
  return db.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, privacyReviewedAt: at },
    update: { privacyReviewedAt: at },
    select: { privacyReviewedAt: true },
  });
}
