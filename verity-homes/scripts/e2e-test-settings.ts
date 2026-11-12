// E2E fixtures for the Neon TEST branch only. Run by `npm run db:test:reset` after the seed.
// Sets obviously fake contact details so property.spec.ts and contact.spec.ts can check the
// wa.me, tel: and mailto: links: WhatsApp 2340000000000, phone +234 000 000 0000 and
// e2e-contact@example.com (a reserved example domain). They are NOT in the seed and must never
// reach the dev or production database:
// - refuses unless ENV_FILE=.env.test
// - refuses production (NODE_ENV / VERCEL_ENV)
// - refuses if the test DATABASE_URL host equals the one in .env.local
// Also adds two [E2E] partners that are not public (see E2E_HIDDEN_PARTNERS), and blog posts for
// blog.spec.ts (see seedE2ePosts): 5 older published posts (pagination), one with raw HTML that
// must never render, one draft, and an old slug that redirects (SlugRedirect).
// It runs before the e2e server is built: SiteSettings is cached (cacheLife "max") and the
// property page is prerendered, so a change made inside a test would never reach the page.
import { existsSync, readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../lib/generated/prisma/client";

const E2E_WHATSAPP = "2340000000000";
const E2E_PHONE = "+234 000 000 0000";
const E2E_EMAIL = "e2e-contact@example.com";
// A private address that must never be shown while showFullAddress is false (contact.spec.ts).
const E2E_PRIVATE_ADDRESS = "E2E-PRIVATE 7 Hidden Close, Onipanu";
// Partners that must NEVER appear on a public page (about.spec.ts): one published without
// consent, one consented but still a draft. Public partners need both (architecture invariant 1).
const E2E_HIDDEN_PARTNERS = [
  { name: "[E2E] Partner without consent", status: "PUBLISHED", consentConfirmed: false },
  { name: "[E2E] Draft partner", status: "DRAFT", consentConfirmed: true },
] as const;

function fail(msg: string): never {
  console.error(`e2e-test-settings: ${msg}`);
  process.exit(1);
}

if (process.env.ENV_FILE !== ".env.test") fail("refusing: run with ENV_FILE=.env.test.");
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production")
  fail("refusing to run in production.");
config({ path: ".env.test", override: true, quiet: true });

const host = (url: string | undefined) => {
  try {
    return url ? new URL(url).hostname.replace("-pooler", "") : "";
  } catch {
    return "";
  }
};
const testHost = host(process.env.DATABASE_URL);
if (!testHost) fail("DATABASE_URL in .env.test is missing or invalid.");
if (existsSync(".env.local")) {
  const devHost = host(parse(readFileSync(".env.local")).DATABASE_URL);
  if (devHost === testHost) fail("refusing: .env.test points at the same database as .env.local.");
}

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

// Raw HTML the renderer must drop (blog.spec.ts). The markers
// make "is it in the page?" checks unambiguous.
const E2E_RAW_HTML_BODY = [
  "## Raw HTML test",
  "",
  "Text before the script.",
  "",
  '<script>window.__e2eXss = "E2E-XSS-MARKER"</script>',
  "",
  '<div class="e2e-raw-div">E2E-RAW-DIV</div>',
  "",
  '<img src="x" onerror="window.__e2eXss=1" alt="e2e-raw-img">',
  "",
  "[A javascript link](javascript:alert(1)) and [an external link](https://example.com/guide).",
].join("\n");

async function seedE2ePosts() {
  await db.slugRedirect.deleteMany({ where: { entity: "POST", fromSlug: { startsWith: "e2e-" } } });
  await db.post.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  const investing = await db.category.findUnique({ where: { slug: "investing" } });
  const day = 86_400_000;
  // Older than the 3 seeded posts, so the seed posts stay on page 1 and in "recent posts".
  const base = Date.now() - 30 * day;
  await db.post.createMany({
    data: [
      ...[1, 2, 3, 4, 5].map((n) => ({
        slug: `e2e-pagination-${n}`,
        title: `[E2E] Pagination post ${n}`,
        excerpt: "[E2E] Test-branch post used to fill a second page.",
        content: "[E2E] Body.",
        categoryId: investing?.id ?? null,
        status: "PUBLISHED" as const,
        publishedAt: new Date(base - n * day),
        coverUrl: "/samples/aerial.jpg",
      })),
      {
        slug: "e2e-raw-html",
        title: "[E2E] Raw HTML is not rendered",
        excerpt: "[E2E] Contains a script tag that must never reach the page.",
        content: E2E_RAW_HTML_BODY,
        status: "PUBLISHED" as const,
        publishedAt: new Date(base - 10 * day),
      },
      {
        slug: "e2e-draft-post",
        title: "[E2E] Draft post",
        excerpt: "[E2E] Never public.",
        content: "[E2E] Draft.",
        status: "DRAFT" as const,
      },
    ],
  });
  await db.slugRedirect.create({
    data: {
      entity: "POST",
      fromSlug: "e2e-old-post-slug",
      toSlug: "sample-tenant-checklist-lagos",
    },
  });
  console.log(
    "e2e-test-settings: [E2E] posts — 5 pagination, 1 raw-HTML, 1 draft; redirect e2e-old-post-slug → sample-tenant-checklist-lagos.",
  );
}

async function main() {
  await db.siteSettings.update({
    where: { id: 1 },
    data: {
      whatsapp: E2E_WHATSAPP,
      phone: E2E_PHONE,
      email: E2E_EMAIL,
      officeAddress: E2E_PRIVATE_ADDRESS,
      showFullAddress: false,
    },
  });
  await seedE2ePosts();
  await db.partner.deleteMany({ where: { name: { startsWith: "[E2E]" } } });
  await db.partner.createMany({ data: E2E_HIDDEN_PARTNERS.map((p) => ({ ...p })) });
  console.log(
    `e2e-test-settings: ${E2E_HIDDEN_PARTNERS.length} non-public [E2E] partners (no consent / draft).`,
  );
  console.log(
    `e2e-test-settings: test-branch SiteSettings whatsapp=${E2E_WHATSAPP}, phone=${E2E_PHONE}, email=${E2E_EMAIL}, private officeAddress set, showFullAddress=false (all fake).`,
  );
}

main()
  .catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)))
  .finally(() => db.$disconnect());
