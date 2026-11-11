// Spec for lib/maps.ts — the privacy rule for property locations lives here.
import { describe, expect, it } from "vitest";
import { propertyMapQuery, mapEmbedUrl, mapsLink } from "@/lib/maps";

const base = {
  area: "Lekki",
  city: "Lagos",
  latitude: 6.4474,
  longitude: 3.472,
  address: "12 Secret Close",
};

describe("propertyMapQuery", () => {
  it("uses exact coordinates only when showExactLocation is true", () => {
    expect(propertyMapQuery({ ...base, showExactLocation: true })).toEqual({
      query: "6.4474,3.472",
      zoom: 15,
      exact: true,
    });
  });
  it("falls back to the area when the exact location is hidden", () => {
    expect(propertyMapQuery({ ...base, showExactLocation: false })).toEqual({
      query: "Lekki, Lagos",
      zoom: 13,
      exact: false,
    });
  });
  it("falls back to the area when coordinates are missing", () => {
    expect(
      propertyMapQuery({ ...base, latitude: null, longitude: null, showExactLocation: true }).exact,
    ).toBe(false);
  });
  it("never leaks the private street address", () => {
    const r = propertyMapQuery({ ...base, showExactLocation: false });
    expect(JSON.stringify(r)).not.toContain("Secret");
  });
});

describe("mapEmbedUrl / mapsLink", () => {
  it("builds a keyless Google Maps embed URL", () => {
    expect(mapEmbedUrl("Onipanu, Lagos", 14)).toBe(
      "https://www.google.com/maps?q=Onipanu%2C%20Lagos&z=14&output=embed",
    );
  });
  it("builds an Open-in-Maps link", () => {
    expect(mapsLink("Onipanu, Lagos")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Onipanu%2C%20Lagos",
    );
  });
});
