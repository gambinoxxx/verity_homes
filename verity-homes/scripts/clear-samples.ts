// Remove the "[SAMPLE]" demo content (Unit 21 step 10).
//
//   npx tsx scripts/clear-samples.ts              # dry run (default): counts only, changes nothing
//   npx tsx scripts/clear-samples.ts --confirm    # deletes
//   ENV_FILE=.env.test npx tsx scripts/clear-samples.ts   # against the TEST branch
//
// ENV_FILE defaults to .env.local, which is the LIVE production database. Only run --confirm
// there once the owner has said yes.
//
// What counts as sample: exactly what the seed owns (prisma/seed-lib.ts cleanupStaleSamples):
// properties/posts by title, plans/testimonials/partners by name, FAQs by question or answer,
// enquiries by name — all starting with "[SAMPLE]" — plus redirects to/from sample slugs.
// Images, plots and documents go with their property; packages with their plan. Real enquiries
// about a sample listing are KEPT (their link is cleared). Settings, subscribers, categories and
// every row without the prefix are never touched. Blob files: only files under samples/ that a
// sample row uses and no real row mentions (lib/sample-cleanup.ts); /public/samples images are
// site code and stay.
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
// lib/storage is server-only (it cannot load in a plain Node script); this one-off owner script
// deletes the few sample files itself.
// eslint-disable-next-line no-restricted-imports
import { del } from "@vercel/blob";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  parseClearArgs,
  sampleBlobsToDelete,
  settingsFieldsWithSample,
  urlsIn,
} from "../lib/sample-cleanup";
import { NO_KEYS, SAMPLE_PREFIX, cleanupStaleSamples } from "../prisma/seed-lib";

const envFile = process.env.ENV_FILE ?? ".env.local";
if (!existsSync(envFile)) throw new Error(`${envFile} not found.`);
config({ path: envFile, quiet: true });
const url = process.env.DATABASE_URL;
if (!url) throw new Error(`DATABASE_URL is missing in ${envFile}.`);

const mode = parseClearArgs(process.argv.slice(2));
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
const starts = { startsWith: SAMPLE_PREFIX };

async function main() {
  // ---- what would go
  const props = await db.property.findMany({
    where: { title: starts },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      images: { select: { url: true } },
      _count: { select: { images: true, plots: true, documents: true } },
    },
  });
  const posts = await db.post.findMany({
    where: { title: starts },
    select: { id: true, slug: true, title: true, status: true, coverUrl: true, content: true },
  });
  const plans = await db.investmentPlan.findMany({
    where: { name: starts },
    select: {
      id: true,
      name: true,
      status: true,
      coverUrl: true,
      _count: { select: { packages: true } },
    },
  });
  const [faqs, testimonials, partners, sampleEnquiries] = await Promise.all([
    db.faq.count({ where: { OR: [{ question: starts }, { answer: starts }] } }),
    db.testimonial.findMany({ where: { name: starts }, select: { avatarUrl: true } }),
    db.partner.findMany({ where: { name: starts }, select: { logoUrl: true } }),
    db.enquiry.count({ where: { name: starts } }),
  ]);
  const propIds = props.map((p) => p.id);
  const planIds = plans.map((p) => p.id);
  const redirects = await db.slugRedirect.count({
    where: {
      OR: [
        {
          entity: "PROPERTY",
          OR: [
            { toSlug: { in: props.map((p) => p.slug) } },
            { fromSlug: { in: props.map((p) => p.slug) } },
          ],
        },
        {
          entity: "POST",
          OR: [
            { toSlug: { in: posts.map((p) => p.slug) } },
            { fromSlug: { in: posts.map((p) => p.slug) } },
          ],
        },
      ],
    },
  });
  // Real enquiries (not "[SAMPLE]"-named) about a sample listing or plan: kept, link cleared.
  const realEnquiriesUnlinked = await db.enquiry.count({
    where: {
      NOT: { name: starts },
      OR: [{ propertyId: { in: propIds } }, { planId: { in: planIds } }],
    },
  });

  // ---- what stays (for reassurance) and Blob files only samples use
  const [realProps, realPosts, realPlans, realTestimonials, realPartners, settings] =
    await Promise.all([
      db.property.findMany({
        where: { NOT: { title: starts } },
        select: { images: { select: { url: true } } },
      }),
      db.post.findMany({
        where: { NOT: { title: starts } },
        select: { coverUrl: true, content: true },
      }),
      db.investmentPlan.findMany({
        where: { NOT: { name: starts } },
        select: { coverUrl: true, description: true },
      }),
      db.testimonial.findMany({ where: { NOT: { name: starts } }, select: { avatarUrl: true } }),
      db.partner.findMany({ where: { NOT: { name: starts } }, select: { logoUrl: true } }),
      db.siteSettings.findUnique({ where: { id: 1 } }),
    ]);
  const sampleUrls = [
    ...props.flatMap((p) => p.images.map((i) => i.url)),
    ...posts.flatMap((p) => [p.coverUrl ?? "", ...urlsIn(p.content)]),
    ...plans.map((p) => p.coverUrl ?? ""),
    ...testimonials.map((t) => t.avatarUrl ?? ""),
    ...partners.map((p) => p.logoUrl ?? ""),
  ].filter(Boolean);
  const realText = JSON.stringify([
    realProps,
    realPosts,
    realPlans,
    realTestimonials,
    realPartners,
    settings,
  ]);
  const blobs = sampleBlobsToDelete(sampleUrls, realText);
  const sampleSettings = settingsFieldsWithSample(settings as Record<string, unknown> | null);

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  console.log(
    `\nclear-samples — ${mode === "confirm" ? "DELETING" : "DRY RUN (nothing changes)"} — ${envFile}\n`,
  );
  console.table({
    "Property (+ images/plots/documents)": {
      rows: props.length,
      published: props.filter((p) => p.status === "PUBLISHED").length,
      children: `${sum(props.map((p) => p._count.images))} / ${sum(props.map((p) => p._count.plots))} / ${sum(props.map((p) => p._count.documents))}`,
    },
    Post: {
      rows: posts.length,
      published: posts.filter((p) => p.status === "PUBLISHED").length,
      children: "",
    },
    "InvestmentPlan (+ packages)": {
      rows: plans.length,
      published: plans.filter((p) => p.status === "PUBLISHED").length,
      children: String(sum(plans.map((p) => p._count.packages))),
    },
    Faq: { rows: faqs, published: "", children: "" },
    Testimonial: { rows: testimonials.length, published: "", children: "" },
    Partner: { rows: partners.length, published: "", children: "" },
    "Enquiry ([SAMPLE]-named)": { rows: sampleEnquiries, published: "", children: "" },
    SlugRedirect: { rows: redirects, published: "", children: "" },
    "Blob files (samples/, unused by real rows)": {
      rows: blobs.length,
      published: "",
      children: "",
    },
  });
  console.log("Kept:");
  console.log(
    `  real properties ${realProps.length}, real posts ${realPosts.length}, real plans ${realPlans.length}, real testimonials ${realTestimonials.length}, real partners ${realPartners.length}`,
  );
  console.log(
    `  real enquiries about a sample listing/plan (kept, link cleared): ${realEnquiriesUnlinked}`,
  );
  console.log(`  settings, subscribers and categories are never touched`);
  if (sampleSettings.length) {
    console.log(
      `  NOTE: site settings still contain "[SAMPLE]" in: ${sampleSettings.join(", ")} — edit in /admin/settings`,
    );
  }
  console.log("\nSample titles:");
  for (const p of props) console.log(`  property  ${p.status.padEnd(9)} ${p.title}`);
  for (const p of posts) console.log(`  post      ${p.status.padEnd(9)} ${p.title}`);
  for (const p of plans) console.log(`  plan      ${p.status.padEnd(9)} ${p.name}`);

  if (mode === "dry-run") {
    console.log("\nDry run: nothing was changed. Re-run with --confirm to delete.\n");
    return;
  }

  const report = await cleanupStaleSamples(db, NO_KEYS);
  console.log("\nDeleted:", report);
  if (blobs.length) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token)
      console.log(
        `Blob: BLOB_READ_WRITE_TOKEN missing in ${envFile}; ${blobs.length} file(s) left.`,
      );
    else {
      await del(blobs, { token });
      console.log(`Blob: deleted ${blobs.length} file(s) under samples/.`);
    }
  }
  console.log(
    "\nPublic pages are cached: redeploy on Vercel (or save any item in admin) so lists refresh.\n",
  );
}

main()
  .catch((e) => {
    console.error("clear-samples failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
