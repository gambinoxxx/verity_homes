// Unit 21 step 6: area grouping, slugs and the templated copy for /properties/in/[area].
import { describe, expect, it } from "vitest";
import { areaCopy, areaMix, areaPath, groupAreas, type AreaRow } from "@/lib/areas";

const d = (iso: string) => new Date(iso);
const rows: AreaRow[] = [
  { area: "Lekki", city: "Lagos", listingType: "SALE", updatedAt: d("2026-11-01") },
  { area: "Lekki ", city: "Lagos", listingType: "LAND", updatedAt: d("2026-11-05") },
  { area: "lekki", city: "Lagos", listingType: "SALE", updatedAt: d("2026-11-03") },
  { area: "Ikeja GRA", city: "Lagos", listingType: "RENT", updatedAt: d("2026-11-02") },
  { area: "!!!", city: "Lagos", listingType: "RENT", updatedAt: d("2026-11-02") },
];

describe("area pages", () => {
  it("groups spellings by slug, counts types, keeps the newest update, skips empty slugs", () => {
    const g = groupAreas(rows);
    expect(g.map((x) => x.slug)).toEqual(["ikeja-gra", "lekki"]);
    const lekki = g[1]!;
    expect(lekki.name).toBe("Lekki");
    expect(lekki.count).toBe(3);
    expect(lekki.byType).toEqual({ SALE: 2, RENT: 0, LAND: 1, OFF_PLAN: 0 });
    expect(lekki.names.sort()).toEqual(["Lekki", "Lekki ", "lekki"].sort());
    expect(lekki.lastModified.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(areaPath("Ikeja GRA")).toBe("/properties/in/ikeja-gra");
  });

  it("describes the mix from counts only", () => {
    expect(areaMix({ SALE: 2, RENT: 1, LAND: 0, OFF_PLAN: 0 })).toBe(
      "2 homes for sale and 1 for rent",
    );
    expect(areaMix({ SALE: 1, RENT: 0, LAND: 3, OFF_PLAN: 1 })).toBe(
      "1 home for sale, 3 plots of land and 1 off-plan property",
    );
    expect(areaMix({ SALE: 0, RENT: 0, LAND: 1, OFF_PLAN: 0 })).toBe("1 plot of land");
  });

  it("H1, title ≤ 60 and description ≤ 155, naming the area", () => {
    for (const name of ["Lekki", "Ikeja GRA", "Victoria Island Extension Phase One"]) {
      const c = areaCopy({
        name,
        city: "Lagos",
        count: 12,
        byType: { SALE: 5, RENT: 4, LAND: 2, OFF_PLAN: 1 },
      });
      expect(c.h1).toBe(`Properties for sale and rent in ${name}, Lagos`);
      expect(c.title.length).toBeLessThanOrEqual(60);
      expect(c.title).toContain(name.slice(0, 20));
      expect(c.description.length).toBeLessThanOrEqual(155);
      expect(c.description).toContain(name);
    }
  });
});
