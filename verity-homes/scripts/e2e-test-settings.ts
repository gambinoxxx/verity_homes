// E2E fixtures for the Neon TEST branch only. Run by `npm run db:test:reset` after the seed.
// Sets an obviously fake WhatsApp number (2340000000000) so property.spec.ts can check the wa.me
// link. It is NOT in the seed and must never reach the dev or production database:
// - refuses unless ENV_FILE=.env.test
// - refuses production (NODE_ENV / VERCEL_ENV)
// - refuses if the test DATABASE_URL host equals the one in .env.local
// It runs before the e2e server is built: SiteSettings is cached (cacheLife "max") and the
// property page is prerendered, so a change made inside a test would never reach the page.
import { existsSync, readFileSync } from "node:fs";
import { config, parse } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../lib/generated/prisma/client";

const E2E_WHATSAPP = "2340000000000";

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

async function main() {
  await db.siteSettings.update({ where: { id: 1 }, data: { whatsapp: E2E_WHATSAPP } });
  console.log(`e2e-test-settings: test-branch SiteSettings.whatsapp = ${E2E_WHATSAPP} (fake).`);
}

main()
  .catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)))
  .finally(() => db.$disconnect());
