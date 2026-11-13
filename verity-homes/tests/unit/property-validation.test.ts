// lib/validation/property.ts (Unit 14): the editor schema shared by the form and the actions.
import { describe, expect, it } from "vitest";
import { formatNairaInput, nairaInputFromKobo } from "@/lib/format";
import {
  EMPTY_PROPERTY,
  type PropertyFormValues,
  fieldId,
  propertySchema,
  publishIssues,
} from "@/lib/validation/property";
import {
  adminPropertiesHref,
  parseAdminPropertyFilters,
} from "@/lib/validation/admin-property-filters";

const base: PropertyFormValues = {
  ...EMPTY_PROPERTY,
  title: "[SAMPLE] Test duplex",
  area: "Lekki",
};
const parse = (patch: Partial<PropertyFormValues>) =>
  propertySchema.safeParse({ ...base, ...patch });
const errorsOf = (patch: Partial<PropertyFormValues>) => {
  const r = parse(patch);
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("required fields", () => {
  it("a title is required; everything else can wait for a draft", () => {
    expect(errorsOf({ title: "  " })).toHaveProperty("title", "Add a title");
    const r = parse({ area: "", price: "" });
    expect(r.success).toBe(true);
  });

  it("rejects unknown listing/property types", () => {
    expect(errorsOf({ listingType: "CASTLE" as never })).toHaveProperty("listingType");
    expect(errorsOf({ propertyType: "IGLOO" as never })).toHaveProperty("propertyType");
  });

  it("publishing needs title, area and a price or price on request", () => {
    expect(
      publishIssues({ title: "A", area: "Lekki", hasPrice: true, priceOnRequest: false }),
    ).toEqual({});
    expect(
      publishIssues({ title: "A", area: "Lekki", hasPrice: false, priceOnRequest: true }),
    ).toEqual({});
    expect(
      Object.keys(publishIssues({ title: " ", area: "", hasPrice: false, priceOnRequest: false })),
    ).toEqual(["title", "area", "price"]);
  });
});

describe("price", () => {
  it("parses naira with separators into kobo", () => {
    const r = parse({ price: "₦250,000,000" });
    expect(r.success && r.data.priceKobo).toBe(25_000_000_000n);
    const k = parse({ price: "1,500.50" });
    expect(k.success && k.data.priceKobo).toBe(150_050n);
    const none = parse({ price: "" });
    expect(none.success && none.data.priceKobo).toBe(null);
  });

  it("friendly errors for junk and zero", () => {
    expect(errorsOf({ price: "12abc" })).toHaveProperty(
      "price",
      "Enter the price in naira, e.g. 250,000,000",
    );
    expect(errorsOf({ price: "0" })).toHaveProperty("price", "Enter a price above ₦0");
    // With "Price on request" the amount isn't checked.
    expect(errorsOf({ price: "12abc", priceOnRequest: true })).not.toHaveProperty("price");
  });

  it("price period only applies to rentals (and a rental needs one)", () => {
    const sale = parse({ listingType: "SALE", pricePeriod: "PER_YEAR" });
    expect(sale.success && sale.data.pricePeriod).toBe("ONE_OFF");
    expect(errorsOf({ listingType: "RENT", pricePeriod: "ONE_OFF" })).toHaveProperty("pricePeriod");
    const rent = parse({ listingType: "RENT", pricePeriod: "PER_MONTH" });
    expect(rent.success && rent.data.pricePeriod).toBe("PER_MONTH");
  });

  it("formats the input as she types, and back from kobo", () => {
    expect(formatNairaInput("2500000")).toBe("2,500,000");
    expect(formatNairaInput("₦1,2a3")).toBe("123");
    expect(formatNairaInput("0012")).toBe("12");
    expect(formatNairaInput("10.555")).toBe("10.55");
    expect(formatNairaInput(".5")).toBe("0.5");
    expect(nairaInputFromKobo(25_000_000_000n)).toBe("250,000,000");
    expect(nairaInputFromKobo(150_050n)).toBe("1,500.50");
    expect(nairaInputFromKobo(null)).toBe("");
  });
});

describe("fields that don't apply are cleared", () => {
  it("land hides beds and baths", () => {
    const byListing = parse({ listingType: "LAND", bedrooms: "4", bathrooms: "5", sizeSqm: "600" });
    expect(byListing.success && [byListing.data.bedrooms, byListing.data.bathrooms]).toEqual([
      null,
      null,
    ]);
    expect(byListing.success && byListing.data.sizeSqm).toBe(600);
    const byType = parse({ listingType: "SALE", propertyType: "LAND", bedrooms: "4" });
    expect(byType.success && byType.data.bedrooms).toBe(null);
    const house = parse({ bedrooms: "4" });
    expect(house.success && house.data.bedrooms).toBe(4);
  });

  it("completion date is kept for off-plan only, and must be a month", () => {
    const off = parse({ listingType: "OFF_PLAN", completionDate: "2027-06" });
    expect(off.success && off.data.completionDate?.toISOString()).toBe("2027-06-01T00:00:00.000Z");
    const sale = parse({ listingType: "SALE", completionDate: "2027-06" });
    expect(sale.success && sale.data.completionDate).toBe(null);
    expect(errorsOf({ listingType: "OFF_PLAN", completionDate: "June" })).toHaveProperty(
      "completionDate",
    );
  });

  it("project status only with showcase", () => {
    const off = parse({ showcase: false, projectStatus: "SELLING_NOW" });
    expect(off.success && off.data.projectStatus).toBe(null);
    const on = parse({ showcase: true, projectStatus: "SELLING_NOW" });
    expect(on.success && on.data.projectStatus).toBe("SELLING_NOW");
  });
});

describe("slug", () => {
  it("accepts lowercase words with single hyphens, or empty (generated)", () => {
    expect(parse({ slug: "4-bed-duplex-lekki" }).success).toBe(true);
    expect(parse({ slug: "" }).success).toBe(true);
    for (const bad of ["Bad Slug", "double--hyphen", "-start", "end-", "ünï", "a/b"]) {
      expect(errorsOf({ slug: bad }), bad).toHaveProperty("slug");
    }
    expect(errorsOf({ slug: "a".repeat(81) })).toHaveProperty("slug");
  });
});

describe("other fields", () => {
  it("counts must be whole numbers", () => {
    expect(errorsOf({ bedrooms: "2.5" })).toHaveProperty("bedrooms");
    expect(errorsOf({ bedrooms: "-1" })).toHaveProperty("bedrooms");
    const r = parse({ bedrooms: "", parkingSpaces: "3" });
    expect(r.success && [r.data.bedrooms, r.data.parkingSpaces]).toEqual([null, 3]);
  });

  it("latitude and longitude come together and stay in range", () => {
    expect(errorsOf({ latitude: "6.4474", longitude: "" })).toHaveProperty("longitude");
    expect(errorsOf({ latitude: "95", longitude: "3.4" })).toHaveProperty("latitude");
    expect(errorsOf({ latitude: "abc", longitude: "3.4" })).toHaveProperty("latitude");
    const r = parse({ latitude: "6.4474", longitude: "3.4720", showExactLocation: true });
    expect(r.success && [r.data.latitude, r.data.longitude, r.data.showExactLocation]).toEqual([
      6.4474,
      3.472,
      true,
    ]);
    expect(errorsOf({ showExactLocation: true })).toHaveProperty("showExactLocation");
  });

  it("features are trimmed and de-duplicated; documents and nearby need names", () => {
    const r = parse({ features: ["Pool", "pool", " Gym "] });
    expect(r.success && r.data.features).toEqual(["Pool", "Gym"]);
    expect(errorsOf({ documents: [{ name: " ", verified: true }] })).toHaveProperty(
      "documents.0.name",
    );
    expect(errorsOf({ nearby: [{ place: "Toll gate", minutes: "0" }] })).toHaveProperty(
      "nearby.0.minutes",
    );
    const n = parse({ nearby: [{ place: "Toll gate", minutes: "5" }] });
    expect(n.success && n.data.nearby).toEqual([{ place: "Toll gate", minutes: 5 }]);
  });

  it("empty optional text becomes null; city defaults to Lagos", () => {
    const r = parse({ address: "", seoTitle: "", city: "" });
    expect(r.success && [r.data.address, r.data.seoTitle, r.data.city]).toEqual([
      null,
      null,
      "Lagos",
    ]);
  });

  it("field ids for errors and focus", () => {
    expect(fieldId("documents.0.name")).toBe("f-documents-0-name");
  });
});

describe("admin list filters", () => {
  it("parses each param on its own, never throws", () => {
    expect(
      parseAdminPropertyFilters({ status: "draft", q: " lekki ", type: "rent", page: "2" }),
    ).toEqual({
      status: "draft",
      q: "lekki",
      type: "rent",
      page: 2,
    });
    expect(parseAdminPropertyFilters({ status: "x", type: "castle", page: "-3" })).toEqual({
      status: "all",
      q: "",
      type: null,
      page: 1,
    });
  });

  it("builds list URLs (page resets when filters change)", () => {
    const f = parseAdminPropertyFilters({ status: "published", q: "lekki", page: "3" });
    expect(adminPropertiesHref(f, { type: "land" })).toBe(
      "/admin/properties?status=published&q=lekki&type=land",
    );
    expect(adminPropertiesHref(f, { status: "all", q: "" })).toBe("/admin/properties");
  });
});
