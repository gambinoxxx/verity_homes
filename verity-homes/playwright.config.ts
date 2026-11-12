import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv, parse } from "dotenv";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// ---- E2E always runs against the Neon TEST branch (.env.test), never the dev database ----
// The values are loaded into process.env, which the web server below inherits; real env vars
// take precedence over .env.local in Next.js, so the built app talks to the test branch.
// Refuses to run if .env.test is missing, still a placeholder, or points at .env.local's host.
function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname.replace("-pooler", "") : "";
  } catch {
    return "";
  }
}

function loadTestEnv() {
  if (!existsSync(".env.test")) {
    throw new Error("E2E refuses to run: .env.test is missing (see testing/TESTING.md §5).");
  }
  const test = parse(readFileSync(".env.test"));
  const host = hostOf(test.DATABASE_URL);
  if (!host)
    throw new Error("E2E refuses to run: DATABASE_URL in .env.test is missing or invalid.");
  if (/ep-xxxx|USER:PASSWORD|REGION/.test(test.DATABASE_URL ?? "")) {
    throw new Error("E2E refuses to run: DATABASE_URL in .env.test is still the placeholder.");
  }
  if (existsSync(".env.local")) {
    const local = parse(readFileSync(".env.local"));
    if (hostOf(local.DATABASE_URL) === host) {
      throw new Error(
        "E2E refuses to run: .env.test DATABASE_URL is the same database as .env.local. " +
          "Point .env.test at the Neon test branch.",
      );
    }
  }
  loadEnv({ path: ".env.test", override: true, quiet: true });
  // Enquiry emails from e2e go to Resend's test inbox only, whatever .env.test says.
  process.env.ENQUIRY_NOTIFY_TO = "delivered@resend.dev";
}

loadTestEnv();

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // reduced motion keeps screenshots stable (no preloader, no marquee drift)
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  // start the app automatically unless testing a deployed URL
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: baseURL,
        timeout: 240_000,
        // Never reuse a server already on :3000 — it may be `npm run dev` on the dev database.
        // If the port is busy, Playwright stops with an error instead.
        reuseExistingServer: false,
      },
});
