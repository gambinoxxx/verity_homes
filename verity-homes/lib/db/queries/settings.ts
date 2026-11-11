import "server-only";
import { db } from "@/lib/db/client";

const settingsSelect = {
  phone: true,
  whatsapp: true,
  email: true,
  officeArea: true,
  officeAddress: true,
  showFullAddress: true,
  mapQuery: true,
  rcNumber: true,
  companyName: true,
  openingHours: true,
  instagram: true,
  facebook: true,
  x: true,
  linkedin: true,
} as const;

export type SiteSettingsView = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  /** The address line safe to show publicly: officeAddress only if showFullAddress is on. */
  officeDisplay: string;
  mapQuery: string;
  rcNumber: string;
  companyName: string;
  openingHours: string | null;
  socials: {
    instagram: string | null;
    facebook: string | null;
    x: string | null;
    linkedin: string | null;
  };
};

// Same defaults as schema.prisma, used only if the single row has not been created yet.
const DEFAULTS = {
  phone: null,
  whatsapp: null,
  email: null,
  officeArea: "Onipanu, Lagos State",
  officeAddress: null,
  showFullAddress: false,
  mapQuery: "Onipanu, Lagos",
  rcNumber: "9971213",
  companyName: "Verity Homes and Properties Ltd",
  openingHours: null,
  instagram: null,
  facebook: null,
  x: null,
  linkedin: null,
};

export async function getSiteSettings(): Promise<SiteSettingsView> {
  const row =
    (await db.siteSettings.findUnique({ where: { id: 1 }, select: settingsSelect })) ?? DEFAULTS;
  return {
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    officeDisplay: row.showFullAddress && row.officeAddress ? row.officeAddress : row.officeArea,
    mapQuery: row.mapQuery,
    rcNumber: row.rcNumber,
    companyName: row.companyName,
    openingHours: row.openingHours,
    socials: { instagram: row.instagram, facebook: row.facebook, x: row.x, linkedin: row.linkedin },
  };
}
