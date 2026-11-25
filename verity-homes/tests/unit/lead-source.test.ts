// Unit 21 step 4: first-touch capture, cleaning, the "Source" label, the enquiry schema and CSV.
import { describe, expect, it } from "vitest";
import { enquiriesCsv } from "@/lib/enquiry-inbox";
import {
  cleanLeadSource,
  clipValue,
  describeSource,
  firstTouchFrom,
  leadSourceDetails,
} from "@/lib/lead-source";
import { enquirySchema } from "@/lib/validation/enquiry";

const SITE = "https://www.verityhomes.ng";

describe("firstTouchFrom", () => {
  it("keeps UTM tags, click IDs, the landing page and an outside referrer (no query)", () => {
    const t = firstTouchFrom(
      `${SITE}/land-for-sale-lagos?utm_source=google&utm_medium=cpc&utm_campaign=land-lekki&utm_term=land%20in%20lekki&gclid=abc123&x=1`,
      "https://www.google.com/search?q=secret",
    );
    expect(t).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "land-lekki",
      utmTerm: "land in lekki",
      gclid: "abc123",
      landingPage:
        "/land-for-sale-lagos?utm_source=google&utm_medium=cpc&utm_campaign=land-lekki&utm_term=land%20in%20lekki&gclid=abc123&x=1",
      referrer: "https://www.google.com/search",
    });
  });

  it("ignores our own site and odd referrers", () => {
    expect(firstTouchFrom(`${SITE}/contact`, `${SITE}/properties`)).toEqual({
      landingPage: "/contact",
    });
    expect(firstTouchFrom(`${SITE}/`, "android-app://com.x")).toEqual({ landingPage: "/" });
    expect(firstTouchFrom(`${SITE}/`, "not a url")).toEqual({ landingPage: "/" });
  });

  it("caps long values", () => {
    const t = firstTouchFrom(`${SITE}/?utm_campaign=${"c".repeat(400)}`, "");
    expect(t.utmCampaign).toHaveLength(150);
    expect(t.landingPage).toHaveLength(300);
  });
});

describe("cleaning", () => {
  it("clipValue trims, strips control characters, caps and drops empties", () => {
    expect(clipValue("  a\u0000b\nc  ", 10)).toBe("abc");
    expect(clipValue("", 10)).toBeUndefined();
    expect(clipValue(42, 10)).toBeUndefined();
    expect(clipValue("abcdef", 3)).toBe("abc");
  });

  it("cleanLeadSource keeps known string fields only", () => {
    expect(cleanLeadSource({ utmSource: "ig", evil: "x", gclid: 5 })).toEqual({ utmSource: "ig" });
    expect(cleanLeadSource(null)).toEqual({});
    expect(cleanLeadSource("x")).toEqual({});
  });
});

describe("describeSource", () => {
  it.each([
    [
      { utmSource: "google", utmMedium: "cpc", utmCampaign: "land-lekki" },
      "Google Ads · land-lekki",
    ],
    [{ gclid: "x", landingPage: "/" }, "Google Ads"],
    [{ utmSource: "google", gclid: "x" }, "Google Ads"],
    [
      { utmSource: "instagram", utmMedium: "paid_social", utmCampaign: "dec" },
      "Instagram Ads · dec",
    ],
    [{ utmSource: "ig", utmMedium: "social" }, "Instagram"],
    [{ utmSource: "facebook" }, "Facebook"],
    [{ utmSource: "newsletter", utmMedium: "email" }, "newsletter"],
    [{ fbclid: "x", referrer: "https://l.instagram.com/" }, "Instagram"],
    [{ fbclid: "x", referrer: "https://m.facebook.com/" }, "Facebook"],
    [{ referrer: "https://www.google.com/", landingPage: "/" }, "Google search"],
    [{ referrer: "https://www.google.com.ng/" }, "Google search"],
    [{ referrer: "https://www.bing.com/" }, "Bing search"],
    [{ referrer: "https://www.nairaland.com/123" }, "nairaland.com"],
    [{ landingPage: "/properties" }, "Direct"],
  ])("%j → %s", (input, label) => {
    expect(describeSource(input)).toBe(label);
  });

  it("is null when nothing was recorded (older enquiries)", () => {
    expect(describeSource({})).toBeNull();
    expect(describeSource({ utmSource: null, landingPage: null })).toBeNull();
  });

  it("lists the raw values with click IDs shortened", () => {
    expect(
      leadSourceDetails({ utmCampaign: "land-lekki", gclid: "abcdefghijklmnopqrstuvwxyz" }),
    ).toEqual([
      ["Campaign", "land-lekki"],
      ["Google click ID", "abcdefghijkl…"],
    ]);
  });
});

describe("enquiry schema lead fields", () => {
  const base = {
    name: "Ada Obi",
    phone: "08030000000",
    source: "LANDING_PAGE",
    startedAt: String(Date.now() - 10_000),
  };

  it("accepts and cleans them, and never rejects an enquiry because of them", () => {
    const r = enquirySchema.safeParse({
      ...base,
      utmSource: " google ",
      utmCampaign: "x".repeat(500),
      referrer: "",
      landingPage: "/buy-house-lagos\n",
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.utmSource).toBe("google");
    expect(r.data.utmCampaign).toHaveLength(150);
    expect(r.data.referrer).toBeUndefined();
    expect(r.data.landingPage).toBe("/buy-house-lagos");
    expect(r.data.source).toBe("LANDING_PAGE");
  });

  it("works without any of them", () => {
    expect(enquirySchema.safeParse(base).success).toBe(true);
  });
});

describe("CSV", () => {
  it("has Source, Campaign, Landing page and Referrer columns", () => {
    const csv = enquiriesCsv([
      {
        createdAt: new Date("2026-11-25T10:00:00Z"),
        name: "Ada",
        phone: "2348030000000",
        email: null,
        interest: "LAND",
        propertyTitle: null,
        planName: null,
        status: "NEW",
        message: "",
        note: null,
        leadSource: "Google Ads · land-lekki",
        utmCampaign: "land-lekki",
        landingPage: "/land-for-sale-lagos",
        referrer: null,
      },
    ]);
    expect(csv.split("\r\n")[1]).toContain(
      ",Google Ads · land-lekki,land-lekki,/land-for-sale-lagos,",
    );
  });
});
