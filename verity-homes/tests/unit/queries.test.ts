// Query-layer invariants, run against the Neon "test" branch (.env.test).
// Prepare it first:  npm run db:test:reset   (migrate reset + seed on the test branch)
import { existsSync, readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setDatabaseTimeouts } from "./helpers/test-db";

setDatabaseTimeouts();

// ---- safety: refuse to run without .env.test, or against the dev database ----------------
function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host : null;
  } catch {
    return null;
  }
}
if (!existsSync(".env.test")) {
  throw new Error("tests/unit/queries.test.ts needs .env.test with the Neon test-branch URLs.");
}
const testHost = hostOf(process.env.DATABASE_URL);
if (!testHost || testHost.includes("ep-xxxx")) {
  throw new Error(".env.test still has placeholder DATABASE_URL / DIRECT_URL values.");
}
if (existsSync(".env.local")) {
  const devUrl = /^DATABASE_URL="?([^"\n]+)"?/m.exec(readFileSync(".env.local", "utf8"))?.[1];
  if (hostOf(devUrl) === testHost) {
    throw new Error(
      ".env.test points at the same database as .env.local. Use the Neon test branch.",
    );
  }
}

// Imported after the guards so the Prisma client is created with the test-branch URL.
const { db } = await import("@/lib/db/client");
const properties = await import("@/lib/db/queries/properties");
const invest = await import("@/lib/db/queries/invest");
const posts = await import("@/lib/db/queries/posts");
const trust = await import("@/lib/db/queries/trust");
const { getSiteSettings } = await import("@/lib/db/queries/settings");

const SEEDED_DRAFT_SLUG = "sample-draft-hidden";
const SEEDED_PROPERTY_SLUG = "sample-contemporary-detached-duplex"; // has a private address
const TEST_TAG = "[TEST]";

// Extra draft / no-consent rows for entities the seed does not cover.
beforeAll(async () => {
  await db.investmentPlan.create({
    data: {
      name: `${TEST_TAG} Draft plan`,
      minimumKobo: 100n,
      returnRatePercent: 0,
      tenureMonths: 6,
      payoutFrequency: "MONTHLY",
      status: "DRAFT",
    },
  });
  await db.faq.create({
    data: { question: `${TEST_TAG} Draft FAQ`, answer: "x", status: "DRAFT" },
  });
  await db.post.create({
    data: { slug: "test-draft-post", title: `${TEST_TAG} Draft post`, status: "DRAFT" },
  });
  await db.partner.createMany({
    data: [
      { name: `${TEST_TAG} Published, no consent`, status: "PUBLISHED", consentConfirmed: false },
      { name: `${TEST_TAG} Draft with consent`, status: "DRAFT", consentConfirmed: true },
    ],
  });
});

afterAll(async () => {
  await db.investmentPlan.deleteMany({ where: { name: { startsWith: TEST_TAG } } });
  await db.faq.deleteMany({ where: { question: { startsWith: TEST_TAG } } });
  await db.post.deleteMany({ where: { title: { startsWith: TEST_TAG } } });
  await db.partner.deleteMany({ where: { name: { startsWith: TEST_TAG } } });
  await db.$disconnect();
});

const json = (v: unknown) => JSON.stringify(v);

describe("properties list (Unit 5)", () => {
  it("area dropdown lists published areas only, A–Z, once each", async () => {
    const areas = await properties.getPublishedAreas();
    expect(areas).toEqual([...new Set(areas)].sort((a, b) => a.localeCompare(b)));
    expect(areas).toContain("Lekki");
    expect(areas).not.toContain("Surulere"); // the seeded draft's area
  });

  it("includes Price on request listings unless a price filter is set", async () => {
    const all = await properties.listProperties({});
    expect(all.items.some((p) => p.priceOnRequest)).toBe(true);
    const priced = await properties.listProperties({ min: 0 });
    expect(priced.items.length).toBeGreaterThan(0);
    expect(priced.items.every((p) => !p.priceOnRequest)).toBe(true);
  });

  it("filters by listing type and price range in naira", async () => {
    const rent = await properties.listProperties({ type: "rent", min: 3_000_000, max: 6_000_000 });
    expect(rent.items.map((p) => p.slug)).toEqual(["sample-detached-bungalow"]);
  });

  it("clamps a page past the end to the last page", async () => {
    const page = await properties.listProperties({ page: 99 });
    expect(page.page).toBe(page.pageCount);
    expect(page.items.length).toBeGreaterThan(0);
  });
});

describe("drafts are never returned", () => {
  it("property lists exclude drafts", async () => {
    const featured = await properties.getFeaturedProperties(50);
    const showcase = await properties.getShowcaseProperties(50);
    const listed = await properties.listProperties({});
    for (const list of [featured, showcase, listed.items]) {
      expect(list.length).toBeGreaterThan(0);
      expect(list.map((p) => p.slug)).not.toContain(SEEDED_DRAFT_SLUG);
    }
    expect(listed.total).toBe(7); // the 7 published [SAMPLE] properties (incl. the Unit 17b estate)
  });

  it("getPropertyBySlug returns null for a draft", async () => {
    expect(await properties.getPropertyBySlug(SEEDED_DRAFT_SLUG)).toBeNull();
  });

  it("similar properties exclude drafts and the property itself", async () => {
    const sale = await properties.getPropertyBySlug(SEEDED_PROPERTY_SLUG);
    expect(sale).not.toBeNull();
    const similar = await properties.getSimilarProperties(sale!);
    const slugs = similar.map((p) => p.slug);
    expect(slugs).not.toContain(SEEDED_DRAFT_SLUG);
    expect(slugs).not.toContain(SEEDED_PROPERTY_SLUG);
    expect(similar.every((p) => p.listingType === "SALE")).toBe(true);
  });

  it("plans, FAQs and posts exclude drafts", async () => {
    expect(json(await invest.getPublishedPlans())).not.toContain(TEST_TAG);
    expect(json(await invest.getFaqs("INVEST"))).not.toContain(TEST_TAG);
    expect(json((await posts.listPosts({})).items)).not.toContain(TEST_TAG);
    expect(await posts.getPostBySlug("test-draft-post")).toBeNull();
  });

  it("the latest posts are published only, newest first, capped at the limit", async () => {
    const latest = await posts.getLatestPosts(3);
    expect(latest.length).toBeLessThanOrEqual(3);
    expect(json(latest)).not.toContain(TEST_TAG);
    const times = latest.map((p) => p.publishedAt?.getTime() ?? 0);
    expect([...times].sort((x, y) => y - x)).toEqual(times);
  });
});

describe("consent is required for testimonials and partners", () => {
  it("never returns a testimonial without consent", async () => {
    const list = await trust.getPublishedTestimonials();
    expect(list).toHaveLength(2);
    expect(list.map((t) => t.name)).not.toContain("[SAMPLE] No consent");
  });

  it("never returns a partner without consent or unpublished", async () => {
    expect(json(await trust.getPublishedPartners())).not.toContain(TEST_TAG);
  });
});

describe("the private address is never selected", () => {
  it("is absent from the property detail and every card", async () => {
    const detail = await properties.getPropertyBySlug(SEEDED_PROPERTY_SLUG);
    expect(detail).not.toBeNull();
    expect(detail).not.toHaveProperty("address");
    expect(json(detail)).not.toContain("PRIVATE ADDRESS");

    const cards = [
      ...(await properties.getFeaturedProperties(50)),
      ...(await properties.getShowcaseProperties(50)),
      ...(await properties.listProperties({})).items,
    ];
    for (const c of cards) expect(c).not.toHaveProperty("address");
    expect(json(cards)).not.toContain("PRIVATE ADDRESS");
  });
});

describe("no BigInt or Decimal leaves the query layer", () => {
  it("returns plain numbers that JSON can serialise", async () => {
    const detail = await properties.getPropertyBySlug("sample-residential-plot-gated-estate");
    expect(detail?.priceKobo).toBe(2_500_000_000);
    expect(detail?.latitude).toBeTypeOf("number");
    expect(detail?.priceLabel).toBe("₦25,000,000");
    const plans = await invest.getPublishedPlans();
    expect(plans[0]?.minimumKobo).toBeTypeOf("number");
    expect(plans[0]?.returnRatePercent).toBeTypeOf("number");
    expect(() => JSON.stringify({ detail, plans })).not.toThrow();
  });

  it("site settings show the area, not a hidden full address", async () => {
    const s = await getSiteSettings();
    expect(s.officeDisplay).toBe("Onipanu, Lagos State");
    expect(s.rcNumber).toBe("9971213");
  });
});
