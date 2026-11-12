import { describe, expect, it } from "vitest";
import { pageNumbers, priceOptions, propertiesListTitle, resultsLabel } from "@/lib/property-list";

describe("propertiesListTitle", () => {
  it("describes the listing type and the area", () => {
    expect(propertiesListTitle({ type: "rent" })).toBe("Properties for rent in Lagos");
    expect(propertiesListTitle({ type: "land", area: "ibeju-lekki" })).toBe(
      "Land for sale in Ibeju-Lekki",
    );
    expect(propertiesListTitle({})).toBe("Properties for sale and rent in Lagos");
    expect(propertiesListTitle({ type: "offplan", area: "Yaba" })).toBe(
      "Off-plan properties in Yaba",
    );
  });
});

describe("priceOptions", () => {
  it("offers the listing type's ranges and preselects the one in the URL", () => {
    const rent = priceOptions({ type: "rent", min: 3_000_000, max: 6_000_000 });
    expect(rent.options.map((o) => o.label)).toContain("₦3M – ₦6M");
    expect(rent.selected).toBe("3000000-6000000");
    expect(priceOptions({ type: "sale", min: 500_000_000 }).selected).toBe("500000000-");
    expect(priceOptions({ type: "land" }).options).toHaveLength(4);
  });

  it("uses the sale ranges for All and Off-plan", () => {
    expect(priceOptions({}).options[0]?.label).toBe("Under ₦50M");
    expect(priceOptions({ type: "offplan" }).options[0]?.label).toBe("Under ₦50M");
    expect(priceOptions({}).selected).toBe("");
  });

  it("keeps a min/max that is not a preset as a custom option", () => {
    const custom = priceOptions({ type: "sale", min: 70_000_000, max: 90_000_000 });
    expect(custom.selected).toBe("custom");
    expect(custom.options.at(-1)?.label).toBe("₦70,000,000 – ₦90,000,000");
    expect(priceOptions({ min: 1_000_000 }).options.at(-1)?.label).toBe("₦1,000,000 and above");
  });
});

describe("resultsLabel", () => {
  it("counts results, with a range once there are several pages", () => {
    expect(resultsLabel(6, 1, 12)).toBe("Showing 6 properties");
    expect(resultsLabel(1, 1, 12)).toBe("Showing 1 property");
    expect(resultsLabel(30, 2, 12)).toBe("Showing 13–24 of 30 properties");
    expect(resultsLabel(30, 3, 12)).toBe("Showing 25–30 of 30 properties");
  });
});

describe("pageNumbers", () => {
  it("lists every page when there are few, and gaps when there are many", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(pageNumbers(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(pageNumbers(1, 12)).toEqual([1, 2, null, 12]);
  });
});
