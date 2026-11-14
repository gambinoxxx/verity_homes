// Development / test seed. Every row is marked [SAMPLE] so it can never be mistaken for real data.
// Images point at /samples/*.jpg — already copied into public/samples/ in Unit 1.
// Run: npx prisma db seed   (also runs after `prisma migrate reset`)
// Prisma 7 does not load env files itself. Use .env.local by default;
// ENV_FILE=.env.test points every Prisma command (and the seed) at the test branch.
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../lib/generated/prisma/client";

if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data into production.");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});
const N = (naira: number) => BigInt(naira) * 100n; // naira → kobo

async function main() {
  // wipe sample content (keeps the schema)
  await db.enquiry.deleteMany();
  await db.propertyImage.deleteMany();
  await db.propertyDocument.deleteMany();
  await db.property.deleteMany();
  await db.post.deleteMany();
  await db.category.deleteMany();
  await db.investmentPlan.deleteMany();
  await db.faq.deleteMany();
  await db.testimonial.deleteMany();
  await db.partner.deleteMany();
  await db.slugRedirect.deleteMany();

  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      officeArea: "Onipanu, Lagos State",
      mapQuery: "Onipanu, Lagos",
      rcNumber: "9971213",
      whatsapp: null,
      phone: null,
      email: null,
    },
  });

  const properties = [
    {
      slug: "sample-contemporary-detached-duplex",
      title: "[SAMPLE] Contemporary Detached Duplex",
      listingType: "SALE",
      propertyType: "DETACHED",
      featured: true,
      showcase: true,
      projectStatus: "SELLING_NOW",
      priceOnRequest: true,
      bedrooms: 5,
      bathrooms: 6,
      sizeSqm: 450,
      parkingSpaces: 3,
      titleDocument: "C_OF_O",
      area: "Lekki",
      latitude: 6.4474,
      longitude: 3.472,
      showExactLocation: false,
      address: "[SAMPLE PRIVATE ADDRESS]",
      imgs: ["villa", "dusk", "building", "tower", "aerial"],
    },
    {
      slug: "sample-residential-plot-gated-estate",
      title: "[SAMPLE] Residential Plot in Gated Estate",
      listingType: "LAND",
      propertyType: "LAND",
      featured: true,
      priceKobo: N(25_000_000),
      sizeSqm: 600,
      titleDocument: "GOVERNORS_CONSENT",
      area: "Ibeju-Lekki",
      latitude: 6.4698,
      longitude: 3.7116,
      showExactLocation: true,
      imgs: ["aerial"],
    },
    {
      slug: "sample-serviced-3-bedroom-apartment",
      title: "[SAMPLE] Serviced 3-Bedroom Apartment",
      listingType: "RENT",
      propertyType: "APARTMENT",
      featured: true,
      showcase: true,
      projectStatus: "COMPLETED",
      priceKobo: N(6_500_000),
      pricePeriod: "PER_YEAR",
      bedrooms: 3,
      bathrooms: 3,
      sizeSqm: 160,
      parkingSpaces: 1,
      area: "Ikoyi",
      imgs: ["tower", "building"],
    },
    {
      slug: "sample-semi-detached-family-home",
      title: "[SAMPLE] Semi-Detached Family Home",
      listingType: "SALE",
      propertyType: "SEMI_DETACHED",
      featured: true,
      priceKobo: N(180_000_000),
      bedrooms: 4,
      bathrooms: 4,
      sizeSqm: 300,
      parkingSpaces: 2,
      titleDocument: "REGISTERED_DEED",
      area: "Ikeja GRA",
      imgs: ["dusk"],
    },
    {
      slug: "sample-off-plan-residences",
      title: "[SAMPLE] Off-Plan Residences",
      listingType: "OFF_PLAN",
      propertyType: "APARTMENT",
      featured: true,
      showcase: true,
      projectStatus: "OFF_PLAN",
      priceOnRequest: true,
      area: "Yaba",
      completionDate: new Date("2028-06-01"),
      imgs: ["building", "tower"],
    },
    {
      slug: "sample-detached-bungalow",
      title: "[SAMPLE] Detached Bungalow",
      listingType: "RENT",
      propertyType: "BUNGALOW",
      featured: true,
      priceKobo: N(4_000_000),
      pricePeriod: "PER_YEAR",
      bedrooms: 3,
      bathrooms: 3,
      sizeSqm: 220,
      area: "Gbagada",
      imgs: ["villa"],
    },
  ] as const;

  for (const [i, p] of properties.entries()) {
    const { imgs, ...data } = p;
    await db.property.create({
      data: {
        ...data,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 86_400_000),
        description:
          "[SAMPLE] Description written by the admin — layout, finishes, what makes it special and who it suits.",
        features: ["Fitted kitchen", "24/7 security", "Ample water supply", "Gated estate"],
        nearby: [
          { place: "[SAMPLE] Landmark", minutes: 5 },
          { place: "[SAMPLE] Shopping mall", minutes: 10 },
        ],
        images: {
          create: imgs.map((k, n) => ({
            url: `/samples/${k}.jpg`,
            pathname: `samples/${k}.jpg`,
            alt: `[SAMPLE] ${k} photo`,
            sortOrder: n,
          })),
        },
        documents:
          "titleDocument" in data && data.titleDocument
            ? {
                create: [
                  { name: "Certificate of Occupancy (C of O)", sortOrder: 0 },
                  { name: "Survey plan", sortOrder: 1 },
                ],
              }
            : undefined,
      },
    });
  }

  // Unit 17b: an estate with plot options (sizes, prices and deposits follow the real example the
  // owner gave; names are [SAMPLE] — the real listing is entered in the admin, not seeded).
  await db.property.create({
    data: {
      slug: "sample-palm-estate-plots",
      title: "[SAMPLE] Palm Estate Plots",
      listingType: "LAND",
      propertyType: "LAND",
      status: "PUBLISHED",
      publishedAt: new Date(Date.now() - 6 * 86_400_000),
      area: "Lekki",
      city: "Lagos",
      titleDocument: "C_OF_O",
      priceKobo: N(18_000_000), // = the cheapest plot ("From ₦18,000,000")
      description:
        "[SAMPLE] An estate offering several plot sizes — choose the one that fits what you want to build.",
      features: ["Gated estate", "Good road network"],
      developerName: "[SAMPLE] Estate developer",
      paymentPlan: "6 months interest-free",
      offerNote: "Pay ₦5M for immediate physical allocation",
      termsNote: "Possession of the land is subject to full payment.",
      images: {
        create: [
          {
            url: "/samples/aerial.jpg",
            pathname: "samples/aerial.jpg",
            alt: "[SAMPLE] aerial photo",
            sortOrder: 0,
          },
        ],
      },
      documents: { create: [{ name: "Government-allocated C of O", sortOrder: 0 }] },
      plots: {
        create: [
          {
            sizeSqm: 300,
            priceKobo: N(18_000_000),
            initialDepositKobo: N(1_000_000),
            suitableFor: "Duplexes",
            sortOrder: 0,
          },
          {
            sizeSqm: 500,
            priceKobo: N(30_000_000),
            initialDepositKobo: N(1_000_000),
            suitableFor: "Duplexes",
            sortOrder: 1,
          },
          {
            sizeSqm: 600,
            priceKobo: N(36_000_000),
            initialDepositKobo: N(1_000_000),
            suitableFor: "Duplexes",
            sortOrder: 2,
          },
          {
            sizeSqm: 1000,
            priceKobo: N(70_000_000),
            initialDepositKobo: N(5_000_000),
            suitableFor: "Commercial & apartments",
            sortOrder: 3,
          },
        ],
      },
    },
  });

  // one draft that must never appear publicly
  await db.property.create({
    data: {
      slug: "sample-draft-hidden",
      title: "[SAMPLE] Draft — must not be public",
      listingType: "SALE",
      propertyType: "TERRACE",
      area: "Surulere",
      status: "DRAFT",
    },
  });

  await db.investmentPlan.createMany({
    data: [
      {
        name: "[SAMPLE] Starter Plan",
        badge: "Starter",
        minimumKobo: N(1_000_000),
        returnRatePercent: 0,
        tenureMonths: 12,
        payoutFrequency: "MONTHLY",
        status: "PUBLISHED",
        sortOrder: 0,
      },
      {
        name: "[SAMPLE] Growth Plan",
        badge: "Most popular",
        minimumKobo: N(5_000_000),
        returnRatePercent: 0,
        tenureMonths: 18,
        payoutFrequency: "QUARTERLY",
        highlighted: true,
        status: "PUBLISHED",
        sortOrder: 1,
      },
      {
        name: "[SAMPLE] Premium Plan",
        badge: "Premium",
        minimumKobo: N(20_000_000),
        returnRatePercent: 0,
        tenureMonths: 24,
        payoutFrequency: "AT_MATURITY",
        status: "PUBLISHED",
        sortOrder: 2,
      },
    ],
  });

  await db.faq.createMany({
    data: [
      {
        question: "How does a Verity investment plan work?",
        answer:
          "You choose a plan, sign a written agreement, and your funds go into a selected property project run with our development partners. Returns are paid on the schedule stated in your agreement.",
        status: "PUBLISHED",
        sortOrder: 0,
      },
      {
        question: "How and when are returns paid?",
        answer: "[SAMPLE] Payout method and schedule — from the approved plan terms.",
        status: "PUBLISHED",
        sortOrder: 1,
      },
      {
        question: "Can I exit early?",
        answer: "[SAMPLE] Early exit terms — from the approved plan terms.",
        status: "PUBLISHED",
        sortOrder: 2,
      },
      {
        question: "What documents will I receive?",
        answer: "A signed investment agreement and a receipt for every payment.",
        status: "PUBLISHED",
        sortOrder: 3,
      },
    ],
  });

  const cats = await Promise.all(
    [
      ["Investing", "investing"],
      ["Buying guide", "buying-guide"],
      ["Renting", "renting"],
    ].map(([name, slug]) => db.category.create({ data: { name: name!, slug: slug! } })),
  );
  const posts = [
    [
      "sample-how-investment-plans-work",
      "[SAMPLE] How real estate investment plans work — and what to ask before you invest",
      0,
      "aerial",
    ],
    [
      "sample-property-documents-explained",
      "[SAMPLE] C of O, Governor's Consent, Deed: what each property document means",
      1,
      "dusk",
    ],
    [
      "sample-tenant-checklist-lagos",
      "[SAMPLE] A tenant's checklist before you sign a lease in Lagos",
      2,
      "tower",
    ],
  ] as const;
  for (const [i, [slug, title, c, img]] of posts.entries()) {
    await db.post.create({
      data: {
        slug,
        title,
        categoryId: cats[c]!.id,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 3 * 86_400_000),
        readingMinutes: 5,
        excerpt: "[SAMPLE] One or two sentences that sum up the article.",
        content:
          "## [SAMPLE] Heading\n\n[SAMPLE] Article body in Markdown.\n\n> A pull quote.\n\n- Point one\n- Point two",
        coverUrl: `/samples/${img}.jpg`,
        coverPathname: `samples/${img}.jpg`,
        coverAlt: "",
      },
    });
  }

  await db.testimonial.createMany({
    data: [
      {
        name: "[SAMPLE] Client name",
        serviceUsed: "Home buyer",
        quote: "[SAMPLE] Testimonial text — real ones need the client's consent.",
        rating: 5,
        consentConfirmed: true,
        status: "PUBLISHED",
      },
      {
        name: "[SAMPLE] Client name",
        serviceUsed: "Investment plan client",
        quote: "[SAMPLE] Testimonial text — real ones need the client's consent.",
        rating: 5,
        consentConfirmed: true,
        status: "PUBLISHED",
      },
      {
        name: "[SAMPLE] No consent",
        serviceUsed: "Tenant",
        quote: "Must never be shown publicly.",
        consentConfirmed: false,
        status: "PUBLISHED",
      },
    ],
  });

  console.log("Seeded [SAMPLE] data.");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
