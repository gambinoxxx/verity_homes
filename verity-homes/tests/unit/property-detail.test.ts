import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  descriptionParagraphs,
  enquiryInterest,
  jsonLdScript,
  metaDescription,
  propertyFacts,
  propertyJsonLd,
  propertyWhatsappMessage,
} from "@/lib/property-detail";

const SITE = "https://verityhomes.com.ng";

const noFacts = {
  bedrooms: null,
  bathrooms: null,
  sizeSqm: null,
  parkingSpaces: null,
  titleDocument: null,
  completionDate: null,
} as const;

describe("propertyFacts", () => {
  it("lists only the facts that exist, in design order", () => {
    const facts = propertyFacts({
      ...noFacts,
      bedrooms: 5,
      bathrooms: 6,
      sizeSqm: 1450,
      parkingSpaces: 3,
      titleDocument: "C_OF_O",
    });
    expect(facts.map((f) => [f.label, f.value])).toEqual([
      ["Bedrooms", "5"],
      ["Bathrooms", "6"],
      ["Size", "1,450 sqm"],
      ["Parking", "3 cars"],
      ["Title", "C of O"],
    ]);
  });

  it("returns nothing for an empty listing and singular parking", () => {
    expect(propertyFacts(noFacts)).toEqual([]);
    expect(propertyFacts({ ...noFacts, parkingSpaces: 1 })[0]?.value).toBe("1 car");
    expect(propertyFacts({ ...noFacts, parkingSpaces: 0 })).toEqual([]);
  });

  it("shows an off-plan completion date as month and year", () => {
    const [fact] = propertyFacts({ ...noFacts, completionDate: new Date("2028-06-01") });
    expect(fact).toEqual({ key: "completion", label: "Completion", value: "Jun 2028" });
  });
});

describe("descriptionParagraphs", () => {
  it("splits on blank lines, joins single newlines and drops empties", () => {
    expect(descriptionParagraphs("First line\nsame para.\n\n\nSecond.\r\n\r\n  ")).toEqual([
      "First line same para.",
      "Second.",
    ]);
    expect(descriptionParagraphs("   ")).toEqual([]);
  });
});

describe("enquiry helpers", () => {
  it("maps listing type to enquiry interest", () => {
    expect(enquiryInterest("SALE")).toBe("BUYING");
    expect(enquiryInterest("OFF_PLAN")).toBe("BUYING");
    expect(enquiryInterest("RENT")).toBe("RENTING");
    expect(enquiryInterest("LAND")).toBe("LAND");
  });

  it("builds the WhatsApp message naming the property and its URL", () => {
    expect(propertyWhatsappMessage("Duplex", `${SITE}/properties/duplex`)).toBe(
      "Hi Verity, I'm interested in Duplex (https://verityhomes.com.ng/properties/duplex)",
    );
  });
});

describe("metaDescription", () => {
  const base = {
    seoDescription: null,
    description: "",
    listingType: "SALE",
    area: "Lekki",
    city: "Lagos",
  } as const;

  it("prefers the admin's SEO description", () => {
    expect(metaDescription({ ...base, seoDescription: " Custom. ", description: "x" })).toBe(
      "Custom.",
    );
  });

  it("uses the first paragraph, cut at a word boundary under 155 characters", () => {
    const long = "word ".repeat(60).trim();
    const out = metaDescription({ ...base, description: `${long}\n\nSecond paragraph` });
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith("word…")).toBe(true);
  });

  it("falls back to a plain summary", () => {
    expect(metaDescription(base)).toBe("For sale in Lekki, Lagos. Photos, documents and location.");
  });
});

describe("propertyJsonLd", () => {
  const p = {
    slug: "duplex",
    title: "Duplex",
    description: "Nice.",
    seoDescription: null,
    listingType: "SALE",
    area: "Lekki",
    city: "Lagos",
    images: [{ id: "1", url: "/samples/villa.jpg", alt: "", width: null, height: null }],
    publishedAt: new Date("2026-11-01T00:00:00Z"),
    priceKobo: 25_000_000_000,
    priceOnRequest: false,
  } as const;

  it("is a RealEstateListing with area and city only, absolute URLs and a public price", () => {
    const ld = propertyJsonLd({ ...p, images: [...p.images] }, SITE);
    expect(ld).toMatchObject({
      "@type": "RealEstateListing",
      url: `${SITE}/properties/duplex`,
      image: [`${SITE}/samples/villa.jpg`],
      datePosted: "2026-11-01T00:00:00.000Z",
      contentLocation: { address: { addressLocality: "Lekki", addressRegion: "Lagos" } },
      offers: { price: 250_000_000, priceCurrency: "NGN" },
    });
    expect(JSON.stringify(ld)).not.toMatch(/streetAddress|postalCode/);
  });

  it("omits the price when it is on request", () => {
    const ld = propertyJsonLd({ ...p, images: [], priceOnRequest: true }, SITE);
    expect(ld.offers).toBeUndefined();
    expect(ld.image).toBeUndefined();
  });

  it("escapes < so content cannot close the script tag", () => {
    expect(jsonLdScript({ name: "</script><b>" })).not.toContain("</script>");
  });
});

describe("absoluteUrl", () => {
  it("keeps absolute URLs and resolves paths", () => {
    expect(absoluteUrl("https://x.blob.vercel-storage.com/a.jpg", SITE)).toBe(
      "https://x.blob.vercel-storage.com/a.jpg",
    );
    expect(absoluteUrl("/properties/a", SITE)).toBe(`${SITE}/properties/a`);
  });
});
