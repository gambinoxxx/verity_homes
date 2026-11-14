// Unit 17b: plot options — the "From ₦…" helper, size/deposit labels, plot texts, offer expiry,
// editor validation, and the property actions still rejecting non-admins when plots are sent.
import { describe, expect, it } from "vitest";
import { formatListingPrice } from "@/lib/format";
import {
  depositLabel,
  isOfferActive,
  lowestDepositKobo,
  plotEnquiryMessage,
  plotName,
  plotSizeRange,
  plotWhatsappMessage,
} from "@/lib/plots";
import { EMPTY_PROPERTY, type PropertyFormValues, propertySchema } from "@/lib/validation/property";
import { GUARANTEE_MESSAGE } from "@/lib/validation/no-guarantee";

const N = (n: number) => BigInt(n) * 100n;
// The owner's example estate: 300/500/600 sqm with ₦1M deposits, 1000 sqm with ₦5M.
const estate = [
  {
    sizeSqm: 300,
    priceKobo: N(18_000_000),
    initialDepositKobo: N(1_000_000),
    suitableFor: "Duplexes",
  },
  {
    sizeSqm: 500,
    priceKobo: N(30_000_000),
    initialDepositKobo: N(1_000_000),
    suitableFor: "Duplexes",
  },
  {
    sizeSqm: 600,
    priceKobo: N(36_000_000),
    initialDepositKobo: N(1_000_000),
    suitableFor: "Duplexes",
  },
  {
    sizeSqm: 1000,
    priceKobo: N(70_000_000),
    initialDepositKobo: N(5_000_000),
    suitableFor: "Commercial & apartments",
  },
];
const single = {
  priceKobo: N(250_000_000),
  pricePeriod: "ONE_OFF" as const,
  priceOnRequest: false,
};

describe("formatListingPrice (From ₦…)", () => {
  it("the cheapest plot, whatever the order", () => {
    expect(formatListingPrice({ ...single, plots: estate })).toBe("From ₦18,000,000");
    expect(formatListingPrice({ ...single, plots: [...estate].reverse() })).toBe(
      "From ₦18,000,000",
    );
  });
  it("one plot → its price; no plots → the usual label", () => {
    expect(formatListingPrice({ ...single, plots: [estate[1]!] })).toBe("₦30,000,000");
    expect(formatListingPrice({ ...single, plots: [] })).toBe("₦250,000,000");
    expect(formatListingPrice(single)).toBe("₦250,000,000");
    expect(formatListingPrice({ ...single, priceOnRequest: true })).toBe("Price on request");
    expect(
      formatListingPrice({
        priceKobo: N(4_000_000),
        pricePeriod: "PER_YEAR",
        priceOnRequest: false,
      }),
    ).toBe("₦4,000,000 / year");
  });
  it("accepts numbers (as the public queries pass them)", () => {
    expect(
      formatListingPrice({
        ...single,
        plots: [{ priceKobo: 1_800_000_000 }, { priceKobo: 3_000_000_000 }],
      }),
    ).toBe("From ₦18,000,000");
  });
});

describe("plot labels and texts", () => {
  it("size range and deposits", () => {
    expect(plotSizeRange(estate)).toBe("300–1,000 sqm");
    expect(plotSizeRange([estate[0]!])).toBe("300 sqm");
    expect(plotSizeRange([])).toBeNull();
    expect(lowestDepositKobo(estate)).toBe(N(1_000_000));
    expect(depositLabel(estate)).toBe("Initial deposit from ₦1,000,000");
    expect(depositLabel([estate[3]!])).toBe("Initial deposit ₦5,000,000");
    expect(depositLabel([{ sizeSqm: 1, priceKobo: 1n }])).toBeNull();
  });
  it("plot names and the enquiry / WhatsApp texts", () => {
    expect(plotName(estate[1]!)).toBe("500 sqm plot");
    expect(plotName({ sizeSqm: 1000, label: "Commercial plot" })).toBe(
      "Commercial plot (1,000 sqm)",
    );
    expect(plotEnquiryMessage("Palm Estate", estate[1]!)).toBe(
      "I'm interested in the 500 sqm plot at Palm Estate (₦30,000,000). Please contact me.",
    );
    expect(plotWhatsappMessage("Palm Estate", estate[1]!, "https://x/p")).toBe(
      "Hi Verity, I'm interested in the 500 sqm plot at Palm Estate, ₦30,000,000 (https://x/p)",
    );
  });
  it("the offer shows until offerEndsAt", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(isOfferActive(null, now)).toBe(true);
    expect(isOfferActive("2026-11-14T00:00:00Z", now)).toBe(true);
    expect(isOfferActive(new Date("2026-11-13T11:59:59Z"), now)).toBe(false);
  });
});

describe("editor validation with plots", () => {
  const base: PropertyFormValues = { ...EMPTY_PROPERTY, title: "[SAMPLE] Estate", area: "Lekki" };
  const plot = {
    label: "",
    sizeSqm: "300",
    price: "18,000,000",
    deposit: "1,000,000",
    suitableFor: "Duplexes",
  };
  const errorsOf = (patch: Partial<PropertyFormValues>) => {
    const r = propertySchema.safeParse({ ...base, ...patch });
    return r.success
      ? {}
      : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
  };

  it("with plots: price = cheapest plot, price on request off, single price ignored", () => {
    const r = propertySchema.safeParse({
      ...base,
      price: "", // disabled in the editor
      priceOnRequest: true,
      listingType: "RENT",
      pricePeriod: "ONE_OFF", // would be an error for a rental without plots
      plots: [
        { ...plot, sizeSqm: "500", price: "30,000,000" },
        plot,
        {
          ...plot,
          sizeSqm: "1000",
          price: "70,000,000",
          deposit: "5,000,000",
          suitableFor: "Commercial & apartments",
        },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toMatchObject({
      priceKobo: N(18_000_000),
      priceOnRequest: false,
      pricePeriod: "ONE_OFF",
    });
    expect(
      r.success && r.data.plots.map((p) => [p.sizeSqm, p.sortOrder, p.initialDepositKobo]),
    ).toEqual([
      [500, 0, N(1_000_000)],
      [300, 1, N(1_000_000)],
      [1000, 2, N(5_000_000)],
    ]);
  });

  it("size > 0, price > 0, deposit ≤ price; deposit optional", () => {
    expect(errorsOf({ plots: [{ ...plot, sizeSqm: "0" }] })).toHaveProperty("plots.0.sizeSqm");
    expect(errorsOf({ plots: [{ ...plot, sizeSqm: "abc" }] })).toHaveProperty("plots.0.sizeSqm");
    expect(errorsOf({ plots: [{ ...plot, price: "0" }] })).toHaveProperty("plots.0.price");
    expect(errorsOf({ plots: [{ ...plot, price: "" }] })).toHaveProperty(
      "plots.0.price",
      "Add the plot price",
    );
    expect(errorsOf({ plots: [{ ...plot, deposit: "20,000,000" }] })).toHaveProperty(
      "plots.0.deposit",
      "The deposit can't be more than the plot price",
    );
    const ok = propertySchema.safeParse({ ...base, plots: [{ ...plot, deposit: "" }] });
    expect(ok.success && ok.data.plots[0]?.initialDepositKobo).toBeNull();
  });

  it("the estate fields: empty → null, offer ends at the end of that Lagos day", () => {
    const r = propertySchema.safeParse({
      ...base,
      developerName: "Zylus Homes",
      paymentPlan: "6 months interest-free",
      offerNote: "Pay ₦5M for immediate physical allocation",
      offerEndsAt: "2026-12-31",
      termsNote: "",
    });
    expect(r.success && r.data).toMatchObject({
      developerName: "Zylus Homes",
      paymentPlan: "6 months interest-free",
      termsNote: null,
    });
    expect(r.success && r.data.offerEndsAt?.toISOString()).toBe("2026-12-31T22:59:59.000Z");
    expect(errorsOf({ offerEndsAt: "31/12/2026" })).toHaveProperty("offerEndsAt");
  });

  it("no “guarantee” in the new text fields", () => {
    for (const patch of [
      { paymentPlan: "Guaranteed 6 months interest-free" },
      { offerNote: "guaranteed allocation" },
      { termsNote: "We guarantee possession" },
      { developerName: "Guarantee Homes" },
      { plots: [{ ...plot, suitableFor: "Guaranteed returns" }] },
      { plots: [{ ...plot, label: "Guaranteed plot" }] },
    ] as Partial<PropertyFormValues>[]) {
      expect(Object.values(errorsOf(patch))).toContain(GUARANTEE_MESSAGE);
    }
  });
});
