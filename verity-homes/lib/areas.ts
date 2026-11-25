// Area pages /properties/in/[area] (Unit 21 step 6). Pure helpers, unit-tested in
// tests/unit/areas.test.ts. An area page exists for every area (Property.area) with at least one
// PUBLISHED property; names that slugify the same ("Lekki", "lekki ") share one page.
// Everything said about an area comes from the listings themselves — no invented facts.
import { slugify } from "./slug";

export type AreaListingType = "SALE" | "RENT" | "LAND" | "OFF_PLAN";

export type AreaRow = { area: string; city: string; listingType: AreaListingType; updatedAt: Date };

export type AreaGroup = {
  slug: string;
  /** The most used spelling of the area. */
  name: string;
  /** The most common city of its listings ("Lagos"). */
  city: string;
  /** Every spelling that maps to this slug (for the query). */
  names: string[];
  count: number;
  byType: Record<AreaListingType, number>;
  lastModified: Date;
};

export const areaSlug = (area: string) => slugify(area);
export const areaPath = (area: string) => `/properties/in/${areaSlug(area)}`;

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
}

/** One group per area slug, A–Z by name. Areas whose slug is empty are skipped. */
export function groupAreas(rows: readonly AreaRow[]): AreaGroup[] {
  const by = new Map<string, AreaRow[]>();
  for (const r of rows) {
    const slug = areaSlug(r.area);
    if (!slug) continue;
    by.set(slug, [...(by.get(slug) ?? []), r]);
  }
  return [...by.entries()]
    .map(([slug, list]) => {
      const byType: Record<AreaListingType, number> = { SALE: 0, RENT: 0, LAND: 0, OFF_PLAN: 0 };
      for (const r of list) byType[r.listingType] += 1;
      return {
        slug,
        name: mostCommon(list.map((r) => r.area.trim())),
        city: mostCommon(list.map((r) => r.city.trim() || "Lagos")),
        names: [...new Set(list.map((r) => r.area))],
        count: list.length,
        byType,
        lastModified: new Date(Math.max(...list.map((r) => r.updatedAt.getTime()))),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** "2 homes for sale, 1 for rent and 3 plots of land" — from the counts only. */
export function areaMix(byType: Record<AreaListingType, number>): string {
  const parts = [
    byType.SALE ? n(byType.SALE, "home for sale", "homes for sale") : "",
    byType.RENT ? `${byType.RENT} for rent` : "",
    byType.LAND ? n(byType.LAND, "plot of land", "plots of land") : "",
    byType.OFF_PLAN ? n(byType.OFF_PLAN, "off-plan property", "off-plan properties") : "",
  ].filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** H1, <title> (≤ 60 where the name allows) and description (≤ 155). */
export function areaCopy(g: Pick<AreaGroup, "name" | "city" | "count" | "byType">) {
  const where = `${g.name}, ${g.city}`;
  const h1 = `Properties for sale and rent in ${where}`;
  const long = `Properties for Sale & Rent in ${where}`;
  const title = long.length <= 60 ? long : `Property in ${where}`.slice(0, 60);
  const description = `${n(g.count, "property", "properties")} in ${where} (${areaMix(g.byType)}). Titles checked, every fee in writing. See photos and book an inspection.`;
  const intro = `Browse the ${n(g.count, "property", "properties")} we currently list in ${where}: ${areaMix(g.byType)}. Every listing is checked before it goes live — we look at the title documents first and give you every fee in writing. Open a listing for photos, prices and documents, or ask us about ${g.name} on WhatsApp.`;
  return {
    h1,
    title,
    description: description.length <= 155 ? description : `${description.slice(0, 152)}…`,
    intro,
  };
}
