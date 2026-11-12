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
