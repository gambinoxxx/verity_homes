// The seed only touches "[SAMPLE]" rows (prisma/seed-lib.ts). Runs the real cleanup on the TEST
// database with a unique prefix for this test's rows, so the shared [SAMPLE] data other tests use
// is never touched: stale prefixed rows go, kept ones stay, every non-prefixed row survives.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { NO_KEYS, cleanupStaleSamples } from "../../prisma/seed-lib";
import { assertTestDatabase } from "./helpers/test-db";

assertTestDatabase();
const { db } = await import("@/lib/db/client");

const token = randomUUID().slice(0, 8);
const P = `[SAMPLE-T${token}]`; // this test's own "sample" prefix
const REAL = `Real ${token}`; // rows without any prefix: must survive
const slug = (s: string) => `seedtest-${token}-${s}`;

afterAll(async () => {
  await db.enquiry.deleteMany({ where: { name: { contains: token } } });
  await db.property.deleteMany({ where: { slug: { startsWith: `seedtest-${token}` } } });
  await db.faq.deleteMany({ where: { question: { contains: token } } });
  await db.investmentPlan.deleteMany({ where: { name: { contains: token } } });
  await db.testimonial.deleteMany({ where: { name: { contains: token } } });
});

const prop = (s: string, title: string) =>
  db.property.create({
    data: { slug: slug(s), title, listingType: "SALE", propertyType: "DETACHED", area: "Yaba" },
    select: { id: true },
  });

describe("seed cleanup", () => {
  it("removes only stale prefixed rows; real rows, settings and subscribers survive", async () => {
    const stale = await prop("stale", `${P} Stale listing`);
    await prop("kept", `${P} Kept listing`);
    const real = await prop("real", `${REAL} listing`);
    const realMentionsSample = await prop("real2", `My ${P} story`); // prefix not at the start
    await db.propertyPlot.create({
      data: { propertyId: real.id, sizeSqm: 300, priceKobo: 100n, sortOrder: 0 },
    });
    await db.enquiry.createMany({
      data: [
        { name: `${P} buyer`, phone: "2348030000000", source: "CONTACT_PAGE" },
        // a real visitor asking about a sample listing: kept (only unlinked)
        {
          name: `${REAL} buyer`,
          phone: "2348030000001",
          source: "PROPERTY_PAGE",
          propertyId: stale.id,
        },
      ],
    });
    await db.faq.createMany({
      data: [
        { question: `${P} question ${token}`, answer: "x" },
        { question: `${REAL} question?`, answer: `${P} answer` }, // sample by its answer
        { question: `${REAL} real question?`, answer: "A real answer." },
      ],
    });
    await db.investmentPlan.createMany({
      data: [
        {
          name: `${P} Plan ${token}`,
          minimumKobo: 1n,
          returnRatePercent: 0,
          tenureMonths: 6,
          payoutFrequency: "MONTHLY",
        },
        {
          name: `${REAL} Plan`,
          minimumKobo: 1n,
          returnRatePercent: 0,
          tenureMonths: 6,
          payoutFrequency: "MONTHLY",
        },
      ],
    });
    await db.testimonial.createMany({
      data: [
        { name: `${P} Client ${token}`, quote: "x", serviceUsed: "Buyer" },
        { name: `${REAL} Client`, quote: "Real words.", serviceUsed: "Buyer" },
      ],
    });
    const before = {
      settings: await db.siteSettings.count(),
      subscribers: await db.subscriber.count(),
      sharedSamples: await db.property.count({ where: { title: { startsWith: "[SAMPLE]" } } }),
    };

    const report = await cleanupStaleSamples(db, { ...NO_KEYS, propertySlugs: [slug("kept")] }, P);

    expect(report).toMatchObject({
      properties: 1,
      enquiries: 1,
      plans: 1,
      faqs: 2, // the prefixed question, and the one that's sample by its answer
      testimonials: 1,
    });
    expect(await db.property.findUnique({ where: { id: stale.id } })).toBeNull();
    expect(await db.property.count({ where: { slug: slug("kept") } })).toBe(1);
    // non-[SAMPLE] rows survive, with their related rows
    expect(await db.property.findUnique({ where: { id: real.id } })).not.toBeNull();
    expect(await db.propertyPlot.count({ where: { propertyId: real.id } })).toBe(1);
    expect(await db.property.findUnique({ where: { id: realMentionsSample.id } })).not.toBeNull();
    const kept = await db.enquiry.findFirst({ where: { name: `${REAL} buyer` } });
    expect(kept).toMatchObject({ propertyId: null }); // kept, unlinked from the deleted sample
    expect(await db.faq.count({ where: { question: `${REAL} real question?` } })).toBe(1);
    expect(await db.faq.count({ where: { question: `${REAL} question?` } })).toBe(0);
    expect(await db.investmentPlan.count({ where: { name: `${REAL} Plan` } })).toBe(1);
    expect(await db.testimonial.count({ where: { name: `${REAL} Client` } })).toBe(1);
    // never touched
    expect({
      settings: await db.siteSettings.count(),
      subscribers: await db.subscriber.count(),
      sharedSamples: await db.property.count({ where: { title: { startsWith: "[SAMPLE]" } } }),
    }).toEqual(before);
  });

  it("is idempotent: a second run removes nothing", async () => {
    const report = await cleanupStaleSamples(db, { ...NO_KEYS, propertySlugs: [slug("kept")] }, P);
    expect(Object.values(report).every((n) => n === 0)).toBe(true);
  });
});
