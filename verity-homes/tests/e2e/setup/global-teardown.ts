// Runs once after every Playwright run, even when tests failed or were interrupted mid-way
// (e.g. a dropped connection skipped a file's afterAll). Removes what e2e tests create — and
// only that: properties titled "[SAMPLE] E2E …" (with their redirects; photos and documents
// cascade), enquiries, plans and FAQs named "[SAMPLE] E2E …", and Blob files under e2e/
// (BLOB_PATH_PREFIX). (A plans test restores the gold card and order in its own afterAll.) Real or seed data is never matched.
import { neon } from "@neondatabase/serverless";
import { del, list } from "@vercel/blob";

async function sweepDatabase(url: string) {
  const db = neon(url);
  await db`DELETE FROM "Enquiry" WHERE name LIKE ${"[SAMPLE] E2E %"}`;
  await db`DELETE FROM "InvestmentPlan" WHERE name LIKE ${"[SAMPLE] E2E %"}`;
  await db`DELETE FROM "SlugRedirect" WHERE entity = 'PLAN' AND "toSlug" LIKE ${"sample-e2e-%"}`;
  await db`DELETE FROM "Faq" WHERE question LIKE ${"[SAMPLE] E2E %"}`;
  const rows = (await db`SELECT slug FROM "Property" WHERE title LIKE ${"[SAMPLE] E2E %"}`) as {
    slug: string;
  }[];
  if (!rows.length) return 0;
  const slugs = rows.map((r) => r.slug);
  await db`DELETE FROM "Property" WHERE title LIKE ${"[SAMPLE] E2E %"}`;
  await db`DELETE FROM "SlugRedirect" WHERE entity = 'PROPERTY'
           AND ("toSlug" = ANY(${slugs}) OR "fromSlug" = ANY(${slugs}))`;
  return rows.length;
}

async function sweepBlob(token: string) {
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "e2e/", cursor, token });
    if (page.blobs.length) {
      await del(
        page.blobs.map((b) => b.url),
        { token },
      );
      removed += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}

export default async function globalTeardown() {
  const url = process.env.DATABASE_URL;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    if (url) {
      const n = await sweepDatabase(url);
      if (n) console.log(`[teardown] removed ${n} leftover E2E propert${n === 1 ? "y" : "ies"}`);
    }
  } catch (e) {
    console.warn("[teardown] database sweep failed:", e instanceof Error ? e.message : e);
  }
  try {
    if (token && !token.endsWith("...")) {
      const n = await sweepBlob(token);
      if (n) console.log(`[teardown] removed ${n} leftover e2e/ Blob file(s)`);
    }
  } catch (e) {
    console.warn("[teardown] Blob sweep failed:", e instanceof Error ? e.message : e);
  }
}
