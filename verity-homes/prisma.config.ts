// Prisma 7 config. Migrations use the DIRECT (unpooled) Neon URL.
// The app itself connects through the Neon adapter with the pooled URL (see lib/db/client.ts).
// Prisma 7 does not load env files itself. Use .env.local by default;
// ENV_FILE=.env.test points every Prisma command (and the seed) at the test branch.
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
