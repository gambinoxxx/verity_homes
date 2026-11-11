// Prisma 7 config. Migrations use the DIRECT (unpooled) Neon URL.
// The app itself connects through the Neon adapter with the pooled URL (see lib/db/client.ts).
import "dotenv/config";
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
