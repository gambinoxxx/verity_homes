// Spec for lib/format.ts — implement the functions so these pass.
import { describe, expect, it } from "vitest";
import { formatDate, formatNaira, formatPrice, koboFromNaira } from "@/lib/format";

describe("formatNaira", () => {
  it("formats kobo as whole naira with separators", () => {
    expect(formatNaira(25_000_000_000n)).toBe("₦250,000,000");
    expect(formatNaira(350_000_000)).toBe("₦3,500,000");
  });
  it("shows kobo only when there are kobo", () => {
    expect(formatNaira(150_050n)).toBe("₦1,500.50");
  });
});

describe("koboFromNaira", () => {
  it("parses admin input with commas and the naira sign", () => {
    expect(koboFromNaira("₦250,000,000")).toBe(25_000_000_000n);
    expect(koboFromNaira("3500000")).toBe(350_000_000n);
  });
  it("rejects junk", () => {
    expect(() => koboFromNaira("abc")).toThrow();
    expect(() => koboFromNaira("-5")).toThrow();
  });
});

describe("formatPrice", () => {
  it("respects price on request", () => {
    expect(formatPrice({ priceKobo: 100n, pricePeriod: "ONE_OFF", priceOnRequest: true })).toBe(
      "Price on request",
    );
  });
  it("falls back to price on request when no price is set", () => {
    expect(formatPrice({ priceKobo: null, pricePeriod: "ONE_OFF", priceOnRequest: false })).toBe(
      "Price on request",
    );
  });
  it("adds the rent period", () => {
    expect(
      formatPrice({ priceKobo: 350_000_000n, pricePeriod: "PER_YEAR", priceOnRequest: false }),
    ).toBe("₦3,500,000 / year");
    expect(
      formatPrice({ priceKobo: 30_000_000n, pricePeriod: "PER_MONTH", priceOnRequest: false }),
    ).toBe("₦300,000 / month");
  });
});

describe("formatDate", () => {
  it("formats in Lagos time as day, short month, year", () => {
    expect(formatDate(new Date("2026-11-11T10:00:00Z"))).toBe("11 Nov 2026");
    // 23:30 UTC on 31 Dec is already 1 Jan in Lagos (UTC+1).
    expect(formatDate(new Date("2026-12-31T23:30:00Z"))).toBe("1 Jan 2027");
  });
});
