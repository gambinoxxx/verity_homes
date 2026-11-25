// Applies pending Prisma migrations during the Vercel PRODUCTION build (code-standards: "Production
// runs `npx prisma migrate deploy`, as part of the Vercel build command"). Runs from `npm run build`.
// - Not Vercel production (local builds, E2E, preview deployments): does nothing, so a preview
//   can never change the live database.
// - Production without DIRECT_URL: stops the build. Vercel then keeps the previous deployment
//   live, instead of shipping code that expects columns the database doesn't have yet.
// Migrations are additive (new nullable columns / enum values), so the old deployment keeps
// working while this runs. Never prints connection strings.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log("migrate-on-deploy: not a Vercel production build, skipping migrations.");
  process.exit(0);
}
if (!process.env.DIRECT_URL) {
  console.error(
    "migrate-on-deploy: DIRECT_URL is not set for Production in Vercel, so database migrations " +
      "can't run. Add it (Neon → main branch → unpooled connection string) and redeploy. " +
      "The build stops here so the live site keeps the previous version.",
  );
  process.exit(1);
}
console.log("migrate-on-deploy: applying pending migrations (prisma migrate deploy)…");
execSync("npx prisma migrate deploy", { stdio: "inherit" });
