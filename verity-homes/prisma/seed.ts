// Development / test seed. Every row is marked [SAMPLE] so it can never be mistaken for real data.
// SAFE ON A DATABASE WITH REAL CONTENT: it only creates/updates/removes "[SAMPLE]" rows (by key,
// so running it twice changes nothing) and never deletes SiteSettings, Subscribers or any row
// without the prefix — see prisma/seed-lib.ts. It refuses to run in production.
// Images point at /samples/*.jpg — already copied into public/samples/ in Unit 1.
// Run: npx prisma db seed   (also runs after `prisma migrate reset`)
// Prisma 7 does not load env files itself. Use .env.local by default;
// ENV_FILE=.env.test points every Prisma command (and the seed) at the test branch.
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
import { PrismaNeon } from "@prisma/adapter-neon";
import { type Prisma, PrismaClient } from "../lib/generated/prisma/client";
import { type SampleKeys, cleanupStaleSamples } from "./seed-lib";

if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data into production.");
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});
const N = (naira: number) => BigInt(naira) * 100n; // naira → kobo

async function main() {
  // Only "[SAMPLE]" rows are ever touched (prisma/seed-lib.ts). Real content, SiteSettings and
  // Subscribers are never deleted. Sample rows are upserted by key, so this is safe to run twice.
  const removed = await cleanupStaleSamples(db, SEED_KEYS);
  if (Object.values(removed).some((n) => n > 0))
    console.log("Removed stale [SAMPLE] rows:", removed);

  // Created only if missing; never overwritten (the owner edits these in the admin).
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
    await upsertSampleProperty({
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
      images: imgs.map((k) => ({
        url: `/samples/${k}.jpg`,
        pathname: `samples/${k}.jpg`,
        alt: `[SAMPLE] ${k} photo`,
      })),
      documents:
        "titleDocument" in data && data.titleDocument
          ? ["Certificate of Occupancy (C of O)", "Survey plan"]
          : [],
    });
  }

  // Unit 17b: an estate with plot options (sizes, prices and deposits follow the real example the
  // owner gave; names are [SAMPLE] — the real listing is entered in the admin, not seeded).
  await upsertSampleProperty({
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
    images: [
      { url: "/samples/aerial.jpg", pathname: "samples/aerial.jpg", alt: "[SAMPLE] aerial photo" },
    ],
    documents: ["Government-allocated C of O"],
    plots: [
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
    ],
  });

  // one draft that must never appear publicly
  await upsertSampleProperty({
    slug: "sample-draft-hidden",
    title: "[SAMPLE] Draft — must not be public",
    listingType: "SALE",
    propertyType: "TERRACE",
    area: "Surulere",
    status: "DRAFT",
  });

  for (const { packages = [], ...plan } of PLANS) {
    const found = await db.investmentPlan.findFirst({
      where: { name: plan.name },
      select: { id: true },
    });
    const { id } = found
      ? await db.investmentPlan.update({
          where: { id: found.id },
          data: plan,
          select: { id: true },
        })
      : await db.investmentPlan.create({ data: plan, select: { id: true } });
    // Packages are synced by position (update in place, so an enquiry's packageId survives).
    const existing = await db.investmentPackage.findMany({
      where: { planId: id },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    for (const [i, pkg] of packages.entries()) {
      const data = { ...pkg, sortOrder: i };
      if (existing[i]) await db.investmentPackage.update({ where: { id: existing[i].id }, data });
      else await db.investmentPackage.create({ data: { ...data, planId: id } });
    }
    const surplus = existing.slice(packages.length).map((p) => p.id);
    if (surplus.length) await db.investmentPackage.deleteMany({ where: { id: { in: surplus } } });
  }

  for (const faq of FAQS) {
    const found = await db.faq.findFirst({
      where: { question: faq.question },
      select: { id: true },
    });
    if (found) await db.faq.update({ where: { id: found.id }, data: faq });
    else await db.faq.create({ data: faq });
  }

  // Categories are shared with real posts: created if missing, never deleted.
  const cats = await Promise.all(
    [
      ["Investing", "investing"],
      ["Buying guide", "buying-guide"],
      ["Renting", "renting"],
    ].map(([name, slug]) =>
      db.category.upsert({
        where: { slug: slug! },
        update: {},
        create: { name: name!, slug: slug! },
      }),
    ),
  );
  for (const [i, [slug, title, c, img]] of POSTS.entries()) {
    const data = {
      slug,
      title,
      categoryId: cats[c]!.id,
      status: "PUBLISHED" as const,
      publishedAt: new Date(Date.now() - i * 3 * 86_400_000),
      readingMinutes: 5,
      excerpt: "[SAMPLE] One or two sentences that sum up the article.",
      content:
        "## [SAMPLE] Heading\n\n[SAMPLE] Article body in Markdown.\n\n> A pull quote.\n\n- Point one\n- Point two",
      coverUrl: `/samples/${img}.jpg`,
      coverPathname: `samples/${img}.jpg`,
      coverAlt: "",
    };
    await db.post.upsert({ where: { slug }, update: data, create: data });
  }

  for (const t of TESTIMONIALS) {
    const found = await db.testimonial.findFirst({
      where: { name: t.name, serviceUsed: t.serviceUsed },
      select: { id: true },
    });
    if (found) await db.testimonial.update({ where: { id: found.id }, data: t });
    else await db.testimonial.create({ data: t });
  }

  console.log("Seeded [SAMPLE] data.");
}

// ---- Sample content (every title/name starts with "[SAMPLE]" or is created only if missing) ----

const PLANS = [
  {
    name: "[SAMPLE] Starter Plan",
    slug: "sample-starter-plan",
    badge: "Starter",
    minimumKobo: N(1_000_000),
    returnRatePercent: 0,
    tenureMonths: 12,
    payoutFrequency: "MONTHLY" as const,
    highlighted: false,
    status: "PUBLISHED" as const,
    sortOrder: 0,
  },
  {
    name: "[SAMPLE] Growth Plan",
    slug: "sample-growth-plan",
    badge: "Most popular",
    minimumKobo: N(5_000_000),
    returnRatePercent: 0,
    tenureMonths: 18,
    payoutFrequency: "QUARTERLY" as const,
    highlighted: true,
    status: "PUBLISHED" as const,
    sortOrder: 1,
  },
  {
    name: "[SAMPLE] Premium Plan",
    slug: "sample-premium-plan",
    badge: "Premium",
    minimumKobo: N(20_000_000),
    returnRatePercent: 0,
    tenureMonths: 24,
    payoutFrequency: "AT_MATURITY" as const,
    highlighted: false,
    status: "PUBLISHED" as const,
    sortOrder: 2,
  },
  // Unit 17c: a plan with packages and its own page (/invest/sample-12-month-plan).
  {
    name: "[SAMPLE] 12-Month Plan",
    slug: "sample-12-month-plan",
    badge: "12 months",
    summary: "[SAMPLE] Fixed packages over 12 months, per your signed agreement.",
    description:
      "[SAMPLE] Placeholder description. The owner will supply the project details, the partner, " +
      "and how funds are used.\n\n- Pick a package\n- Sign the written agreement\n- " +
      "Receive the expected amount at maturity, per your signed agreement",
    partnerName: "[SAMPLE] Development partner",
    contractWith: "[SAMPLE] Verity Homes and Properties Ltd",
    payoutTerms: "[SAMPLE] Paid at maturity to your bank account, per your signed agreement.",
    exitTerms: "[SAMPLE] Early exit terms — from the approved plan terms.",
    minimumKobo: N(10_000_000),
    returnRatePercent: 0,
    tenureMonths: 12,
    payoutFrequency: "AT_MATURITY" as const,
    highlighted: false,
    status: "PUBLISHED" as const,
    sortOrder: 3,
    packages: [
      { amountKobo: N(10_000_000), returnAmountKobo: N(10_500_000), tenureMonths: 12 },
      { amountKobo: N(20_000_000), returnAmountKobo: N(21_000_000), tenureMonths: 12 },
      { amountKobo: N(30_000_000), returnAmountKobo: N(32_500_000), tenureMonths: 12 },
    ],
  },
];

const FAQS = [
  {
    question: "How does a Verity investment plan work?",
    answer:
      "You choose a plan, sign a written agreement, and your funds go into a selected property project run with our development partners. Returns are paid on the schedule stated in your agreement.",
    status: "PUBLISHED" as const,
    sortOrder: 0,
  },
  {
    question: "How and when are returns paid?",
    answer: "[SAMPLE] Payout method and schedule — from the approved plan terms.",
    status: "PUBLISHED" as const,
    sortOrder: 1,
  },
  {
    question: "Can I exit early?",
    answer: "[SAMPLE] Early exit terms — from the approved plan terms.",
    status: "PUBLISHED" as const,
    sortOrder: 2,
  },
  {
    question: "What documents will I receive?",
    answer: "A signed investment agreement and a receipt for every payment.",
    status: "PUBLISHED" as const,
    sortOrder: 3,
  },
];

const POSTS = [
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

const TESTIMONIALS = [
  {
    name: "[SAMPLE] Client name",
    serviceUsed: "Home buyer",
    quote: "[SAMPLE] Testimonial text — real ones need the client's consent.",
    rating: 5,
    consentConfirmed: true,
    status: "PUBLISHED" as const,
  },
  {
    name: "[SAMPLE] Client name",
    serviceUsed: "Investment plan client",
    quote: "[SAMPLE] Testimonial text — real ones need the client's consent.",
    rating: 5,
    consentConfirmed: true,
    status: "PUBLISHED" as const,
  },
  {
    name: "[SAMPLE] No consent",
    serviceUsed: "Tenant",
    quote: "Must never be shown publicly.",
    rating: null,
    consentConfirmed: false,
    status: "PUBLISHED" as const,
  },
];

const PROPERTY_SLUGS = [
  "sample-contemporary-detached-duplex",
  "sample-residential-plot-gated-estate",
  "sample-serviced-3-bedroom-apartment",
  "sample-semi-detached-family-home",
  "sample-off-plan-residences",
  "sample-detached-bungalow",
  "sample-palm-estate-plots",
  "sample-draft-hidden",
];

/** Everything this seed defines: other "[SAMPLE]" rows are stale and removed. */
const SEED_KEYS: SampleKeys = {
  propertySlugs: PROPERTY_SLUGS,
  postSlugs: POSTS.map(([slug]) => slug),
  planNames: PLANS.map((p) => p.name),
  faqQuestions: FAQS.map((f) => f.question),
  testimonialKeys: TESTIMONIALS.map((t) => `${t.name}|${t.serviceUsed}`),
  partnerNames: [],
};

type SampleProperty = Omit<
  Prisma.PropertyUncheckedCreateInput,
  "images" | "documents" | "plots"
> & {
  slug: string;
  images?: { url: string; pathname: string; alt: string }[];
  documents?: string[];
  plots?: Omit<Prisma.PropertyPlotUncheckedCreateInput, "propertyId" | "sortOrder">[];
};

/**
 * Creates the sample property, or updates it in place (same id, so anything linking to it
 * keeps the link). Its images and documents are replaced; plots are matched by position so
 * their ids stay stable too.
 */
async function upsertSampleProperty({
  images = [],
  documents = [],
  plots = [],
  ...data
}: SampleProperty) {
  if (!data.title.startsWith("[SAMPLE]"))
    throw new Error(`Seed property must be [SAMPLE]: ${data.title}`);
  const existing = await db.property.findUnique({
    where: { slug: data.slug },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      plots: { orderBy: { sortOrder: "asc" }, select: { id: true } },
    },
  });
  if (existing && !existing.title.startsWith("[SAMPLE]")) {
    // a real listing took this slug: leave it alone
    console.warn(`Skipped ${data.slug}: a non-[SAMPLE] property uses this slug.`);
    return;
  }
  const imageRows = images.map((img, n) => ({ ...img, sortOrder: n }));
  const documentRows = documents.map((name, n) => ({ name, sortOrder: n }));
  if (!existing) {
    await db.property.create({
      data: {
        ...data,
        images: { create: imageRows },
        documents: { create: documentRows },
        plots: { create: plots.map((p, n) => ({ ...p, sortOrder: n })) },
      },
    });
    return;
  }
  const { publishedAt, ...rest } = data;
  await db.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: existing.id },
      data: {
        ...rest,
        publishedAt: existing.publishedAt ?? publishedAt ?? null,
        images: { deleteMany: {}, create: imageRows },
        documents: { deleteMany: {}, create: documentRows },
      },
    });
    for (const [n, plot] of plots.entries()) {
      const id = existing.plots[n]?.id;
      if (id) await tx.propertyPlot.update({ where: { id }, data: { ...plot, sortOrder: n } });
      else
        await tx.propertyPlot.create({ data: { ...plot, sortOrder: n, propertyId: existing.id } });
    }
    const extra = existing.plots.slice(plots.length).map((p) => p.id);
    if (extra.length) await tx.propertyPlot.deleteMany({ where: { id: { in: extra } } });
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
