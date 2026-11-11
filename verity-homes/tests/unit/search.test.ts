import { describe, expect, it } from "vitest";
import { searchHref } from "@/lib/search";
import { BUDGET_RANGES, budgetRangeFor, findBudgetRange } from "@/lib/search-ranges";

describe("searchHref", () => {
  it("maps the tabs to the listing type param", () => {
    expect(searchHref("buy", {})).toBe("/properties?type=sale");
    expect(searchHref("rent", {})).toBe("/properties?type=rent");
    expect(searchHref("land", {})).toBe("/properties?type=land");
  });

  it("adds location and property type, trimmed and encoded, and skips empty ones", () => {
    expect(searchHref("rent", { area: "  Ikeja GRA ", ptype: "APARTMENT" })).toBe(
      "/properties?type=rent&area=Ikeja+GRA&ptype=APARTMENT",
    );
    expect(searchHref("buy", { area: "   ", ptype: "" })).toBe("/properties?type=sale");
  });

  it("sends the Invest tab to /invest", () => {
    expect(searchHref("invest", { area: "Lekki", budget: "0-50000000" })).toBe("/invest");
  });

  it("turns a budget range into min/max in naira", () => {
    expect(searchHref("buy", { budget: "50000000-150000000" })).toBe(
      "/properties?type=sale&min=50000000&max=150000000",
    );
    expect(searchHref("rent", { budget: "0-3000000" })).toBe(
      "/properties?type=rent&min=0&max=3000000",
    );
  });

  it("leaves out max for the open-ended 'Above' range", () => {
    expect(searchHref("land", { budget: "80000000-" })).toBe("/properties?type=land&min=80000000");
  });

  it("ignores a budget id that belongs to another tab or does not exist", () => {
    // A Buy range id sent with the Rent tab: not a rent range, so no price filter.
    expect(searchHref("rent", { budget: "50000000-150000000" })).toBe("/properties?type=rent");
    expect(searchHref("buy", { budget: "junk" })).toBe("/properties?type=sale");
  });
});

describe("budget ranges", () => {
  it("has the provisional ranges per listing type, in order, with only the last open-ended", () => {
    expect(BUDGET_RANGES.sale.map((r) => r.label)).toEqual([
      "Under ₦50M",
      "₦50M – ₦150M",
      "₦150M – ₦300M",
      "₦300M – ₦500M",
      "Above ₦500M",
    ]);
    expect(BUDGET_RANGES.rent).toHaveLength(5);
    expect(BUDGET_RANGES.land).toHaveLength(4);
    for (const ranges of Object.values(BUDGET_RANGES)) {
      ranges.forEach((r, i) => {
        const last = i === ranges.length - 1;
        expect(r.max === undefined).toBe(last);
        if (!last) expect(ranges[i + 1]?.min).toBe(r.max); // contiguous
      });
    }
  });

  it("looks ranges up by id and by URL min/max", () => {
    expect(findBudgetRange("rent", "20000000-")?.label).toBe("Above ₦20M");
    expect(budgetRangeFor("land", 10_000_000, 30_000_000)?.label).toBe("₦10M – ₦30M");
    expect(budgetRangeFor("sale", 500_000_000, undefined)?.label).toBe("Above ₦500M");
    expect(budgetRangeFor("sale", 1, 2)).toBeUndefined();
  });
});
