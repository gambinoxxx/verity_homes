// Spec for lib/slug.ts and lib/whatsapp.ts
import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";
import { whatsappLink } from "@/lib/whatsapp";

describe("slugify", () => {
  it("makes clean URL slugs", () => {
    expect(slugify("Contemporary Detached Duplex")).toBe("contemporary-detached-duplex");
    expect(slugify("  5-Bed Duplex — Lekki Phase 1! ")).toBe("5-bed-duplex-lekki-phase-1");
    expect(slugify("Governor's Consent & C of O")).toBe("governors-consent-c-of-o");
  });
});

describe("uniqueSlug", () => {
  it("appends -2, -3… when taken", async () => {
    const taken = new Set(["duplex", "duplex-2"]);
    expect(await uniqueSlug("Duplex", async (s) => taken.has(s))).toBe("duplex-3");
    expect(await uniqueSlug("Bungalow", async (s) => taken.has(s))).toBe("bungalow");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappLink("2348030000000", "Hi, I'm interested in Contemporary Detached Duplex"))
      .toBe("https://wa.me/2348030000000?text=Hi%2C%20I'm%20interested%20in%20Contemporary%20Detached%20Duplex");
  });
  it("strips non-digits from the number", () => {
    expect(whatsappLink("+234 803 000 0000", "Hi")).toBe("https://wa.me/2348030000000?text=Hi");
  });
  it("returns null when no number is configured", () => {
    expect(whatsappLink(null, "Hi")).toBeNull();
  });
});
