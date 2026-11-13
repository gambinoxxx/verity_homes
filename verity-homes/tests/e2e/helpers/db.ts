// Test-branch database access for e2e assertions. playwright.config.ts has already loaded
// .env.test (and refused to run if it points at the dev database).
// Plain SQL through Neon's driver: Playwright compiles tests as CommonJS, and the generated
// Prisma 7 client is ES-module only.
import { neon } from "@neondatabase/serverless";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — run e2e through playwright.config.ts.");
  return neon(url);
}

export type EnquiryRow = {
  phone: string;
  email: string | null;
  interest: string;
  source: string;
  ipHash: string | null;
  emailSentAt: Date | null;
};

export async function findEnquiryByName(name: string): Promise<EnquiryRow | null> {
  const rows = (await sql()`
    SELECT phone, email, interest::text AS interest, source::text AS source,
           "ipHash", "emailSentAt"
    FROM "Enquiry" WHERE name = ${name} LIMIT 1`) as EnquiryRow[];
  return rows[0] ?? null;
}

export async function countSubscribers(email: string): Promise<number> {
  const rows =
    (await sql()`SELECT count(*)::int AS n FROM "Subscriber" WHERE email = ${email}`) as {
      n: number;
    }[];
  return rows[0]?.n ?? 0;
}

/**
 * Removes exactly the rows a test file created. (Desktop and mobile run in parallel workers,
 * so a blanket "delete all [E2E] rows" could remove a row another worker is about to check.)
 */
export async function cleanUpE2eRows(
  enquiryNames: string[],
  subscriberEmails: string[],
): Promise<void> {
  const db = sql();
  if (enquiryNames.length) await db`DELETE FROM "Enquiry" WHERE name = ANY(${enquiryNames})`;
  if (subscriberEmails.length)
    await db`DELETE FROM "Subscriber" WHERE email = ANY(${subscriberEmails})`;
}

export type SettingsRow = {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  officeArea: string;
  officeAddress: string | null;
  showFullAddress: boolean;
  mapQuery: string;
  rcNumber: string;
  companyName: string;
};

export async function getSettingsRow(): Promise<SettingsRow> {
  const rows = (await sql()`
    SELECT phone, email, whatsapp, "officeArea", "officeAddress", "showFullAddress", "mapQuery",
           "rcNumber", "companyName"
    FROM "SiteSettings" WHERE id = 1`) as SettingsRow[];
  if (!rows[0]) throw new Error("SiteSettings row missing — run npm run db:test:reset");
  return rows[0];
}

export async function findEnquirySource(name: string): Promise<string | null> {
  const rows = (await sql()`SELECT source::text AS source FROM "Enquiry" WHERE name = ${name}`) as {
    source: string;
  }[];
  return rows[0]?.source ?? null;
}

export type PlanRow = { id: string; name: string; status: string; highlighted: boolean };

export async function getPlanRows(): Promise<PlanRow[]> {
  return (await sql()`
    SELECT id, name, status::text AS status, highlighted
    FROM "InvestmentPlan" ORDER BY "sortOrder", "createdAt"`) as PlanRow[];
}

export type InvestEnquiryRow = { source: string; planId: string | null; amountKobo: string | null };

export async function findInvestEnquiry(name: string): Promise<InvestEnquiryRow | null> {
  const rows = (await sql()`
    SELECT source::text AS source, "planId", "amountKobo"::text AS "amountKobo"
    FROM "Enquiry" WHERE name = ${name} LIMIT 1`) as InvestEnquiryRow[];
  return rows[0] ?? null;
}

export type PartnerRow = { name: string; status: string; consentConfirmed: boolean };

export async function getPartnerRows(): Promise<PartnerRow[]> {
  return (await sql()`
    SELECT name, status::text AS status, "consentConfirmed"
    FROM "Partner" ORDER BY "sortOrder", name`) as PartnerRow[];
}

export async function countPublishedPosts(): Promise<number> {
  const rows = (await sql()`
    SELECT count(*)::int AS n FROM "Post" WHERE status = 'PUBLISHED'`) as { n: number }[];
  return rows[0]?.n ?? 0;
}

// ---- Admin dashboard (Unit 13) ----

export type DashboardCounts = {
  newEnquiries: number;
  published: number;
  featured: number;
  drafts: number;
  plans: number;
};

export async function dashboardCounts(): Promise<DashboardCounts> {
  const rows = (await sql()`
    SELECT
      (SELECT count(*)::int FROM "Enquiry" WHERE status = 'NEW') AS "newEnquiries",
      (SELECT count(*)::int FROM "Property" WHERE status = 'PUBLISHED') AS published,
      (SELECT count(*)::int FROM "Property" WHERE status = 'PUBLISHED' AND featured) AS featured,
      (SELECT count(*)::int FROM "Property" WHERE status = 'DRAFT') AS drafts,
      (SELECT count(*)::int FROM "InvestmentPlan" WHERE status = 'PUBLISHED') AS plans`) as DashboardCounts[];
  return rows[0]!;
}

/** Ids of the newest enquiries, in dashboard order (createdAt desc, id desc). */
export async function latestEnquiryIds(limit = 5): Promise<string[]> {
  const rows = (await sql()`
    SELECT id FROM "Enquiry" ORDER BY "createdAt" DESC, id DESC LIMIT ${limit}`) as {
    id: string;
  }[];
  return rows.map((r) => r.id);
}

export type SetupFacts = { whatsappSet: boolean; emailSet: boolean; realPublished: number };

export async function setupFacts(): Promise<SetupFacts> {
  const rows = (await sql()`
    SELECT
      coalesce((SELECT btrim(whatsapp) <> '' FROM "SiteSettings" WHERE id = 1), false) AS "whatsappSet",
      coalesce((SELECT btrim(email) <> '' FROM "SiteSettings" WHERE id = 1), false) AS "emailSet",
      (SELECT count(*)::int FROM "Property"
        WHERE status = 'PUBLISHED' AND title NOT LIKE '[SAMPLE]%') AS "realPublished"`) as SetupFacts[];
  return rows[0]!;
}

// ---- Admin properties (Unit 14) ----

/** Removes properties this test created (by exact title) and any redirects to/from their slugs. */
export async function cleanUpE2eProperties(titles: string[]): Promise<void> {
  if (!titles.length) return;
  const db = sql();
  const rows = (await db`SELECT slug FROM "Property" WHERE title = ANY(${titles})`) as {
    slug: string;
  }[];
  const slugs = rows.map((r) => r.slug);
  await db`DELETE FROM "Property" WHERE title = ANY(${titles})`;
  if (slugs.length)
    await db`DELETE FROM "SlugRedirect" WHERE entity = 'PROPERTY'
             AND ("toSlug" = ANY(${slugs}) OR "fromSlug" = ANY(${slugs}))`;
}

export async function findPropertyByTitle(title: string): Promise<{
  id: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
  address: string | null;
} | null> {
  const rows = (await sql()`
    SELECT id, slug, status::text AS status, "publishedAt", address
    FROM "Property" WHERE title = ${title} LIMIT 1`) as {
    id: string;
    slug: string;
    status: string;
    publishedAt: Date | null;
    address: string | null;
  }[];
  return rows[0] ?? null;
}

// ---- Admin photos + map (Unit 15) ----

/** A published [SAMPLE] E2E property to attach photos to; returns its id and slug. */
export async function insertE2eProperty(
  title: string,
  slug: string,
): Promise<{ id: string; slug: string }> {
  const id = `e2e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await sql()`
    INSERT INTO "Property" (id, slug, title, "listingType", "propertyType", status, area, city,
      "priceOnRequest", "publishedAt", "createdAt", "updatedAt")
    VALUES (${id}, ${slug}, ${title}, 'SALE', 'DETACHED', 'PUBLISHED', 'Yaba', 'Lagos',
      true, now(), now(), now())`;
  return { id, slug };
}

export async function propertyPhotos(
  propertyId: string,
): Promise<{ id: string; url: string; alt: string; sortOrder: number; width: number | null }[]> {
  return (await sql()`
    SELECT id, url, alt, "sortOrder", width FROM "PropertyImage"
    WHERE "propertyId" = ${propertyId} ORDER BY "sortOrder"`) as {
    id: string;
    url: string;
    alt: string;
    sortOrder: number;
    width: number | null;
  }[];
}

export async function propertyLocation(
  propertyId: string,
): Promise<{ latitude: string | null; longitude: string | null; showExactLocation: boolean }> {
  const rows = (await sql()`
    SELECT latitude::text AS latitude, longitude::text AS longitude, "showExactLocation"
    FROM "Property" WHERE id = ${propertyId}`) as {
    latitude: string | null;
    longitude: string | null;
    showExactLocation: boolean;
  }[];
  return rows[0]!;
}
