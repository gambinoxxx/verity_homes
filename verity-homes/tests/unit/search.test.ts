import { describe, expect, it } from "vitest";
import { searchHref } from "@/lib/search";

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
    expect(searchHref("invest", { area: "Lekki" })).toBe("/invest");
  });
});
