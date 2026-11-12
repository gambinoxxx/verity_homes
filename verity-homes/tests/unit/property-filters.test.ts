import { describe, expect, it } from "vitest";
import {
  parsePropertyFilters,
  propertiesHref,
  propertyFiltersToQuery,
} from "@/lib/validation/property-filters";
import { searchHref } from "@/lib/search";

const fromQuery = (q: string) => {
  const input: Record<string, string | string[]> = {};
  for (const [k, v] of new URLSearchParams(q)) {
    const prev = input[k];
    input[k] = prev === undefined ? v : [prev].flat().concat(v);
  }
  return parsePropertyFilters(input);
};

describe("parsePropertyFilters", () => {
  it("reads every supported param", () => {
    expect(
      fromQuery(
        "type=rent&q=duplex&area=Lekki&ptype=APARTMENT&min=3000000&max=6000000&beds=3&title=C_OF_O&title=EXCISION&sort=price-asc&page=2",
      ),
    ).toEqual({
      type: "rent",
      q: "duplex",
      area: "Lekki",
      ptype: "APARTMENT",
      min: 3_000_000,
      max: 6_000_000,
      beds: 3,
      title: ["C_OF_O", "EXCISION"],
      sort: "price-asc",
      page: 2,
    });
  });

  it("returns an empty object for no params", () => {
    expect(parsePropertyFilters({})).toEqual({});
  });

  it("drops bad values but keeps the good ones", () => {
    expect(fromQuery("type=banana&beds=-4&page=abc&area=Ikoyi")).toEqual({ area: "Ikoyi" });
    expect(fromQuery("ptype=CASTLE&sort=random&min=1e9&max=12.5&beds=9")).toEqual({});
    expect(fromQuery("page=0")).toEqual({});
    expect(fromQuery("min=99999999999999")).toEqual({});
  });

  it("treats beds=0 as any, and a reversed price range as no price filter", () => {
    expect(fromQuery("beds=0")).toEqual({});
    expect(fromQuery("min=500&max=100")).toEqual({});
  });

  it("accepts comma-separated titles and skips unknown ones", () => {
    expect(fromQuery("title=C_OF_O,NOPE,GOVERNORS_CONSENT,C_OF_O").title).toEqual([
      "C_OF_O",
      "GOVERNORS_CONSENT",
    ]);
  });

  it("trims text and ignores empty strings", () => {
    expect(fromQuery("q=%20%20&area=%20Ajah%20")).toEqual({ area: "Ajah" });
  });

  it("uses the first value when a single-value param repeats", () => {
    expect(fromQuery("type=land&type=rent")).toEqual({ type: "land" });
  });

  it("understands every URL the home search bar sends", () => {
    for (const href of [
      searchHref("buy", { budget: "50000000-150000000" }),
      searchHref("rent", { area: "Ikeja GRA", ptype: "APARTMENT" }),
      searchHref("land", { budget: "80000000-" }),
    ]) {
      const query = href.split("?")[1] ?? "";
      expect(propertyFiltersToQuery(fromQuery(query))).toBe(query);
    }
    expect(fromQuery("type=sale&min=0&max=50000000")).toEqual({
      type: "sale",
      min: 0,
      max: 50_000_000,
    });
  });
});

describe("propertiesHref", () => {
  it("leaves out defaults so equal filters give the same URL", () => {
    expect(propertiesHref({ sort: "newest", page: 1 })).toBe("/properties");
    expect(propertiesHref({ type: "sale", page: 3 }, "#results")).toBe(
      "/properties?type=sale&page=3#results",
    );
  });
});
