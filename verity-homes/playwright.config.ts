import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv, parse } from "dotenv";

// PW_PORT runs the e2e server on another port (e.g. when `npm run dev` already uses 3000).
const port = Number(process.env.PW_PORT) || 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

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

const CLERK_TEST_USER_VARS = [
  "E2E_CLERK_USER_USERNAME",
  "E2E_CLERK_USER_PASSWORD",
  "E2E_CLERK_VIEWER_USERNAME",
  "E2E_CLERK_VIEWER_PASSWORD",
];

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
  // Clerk test-user logins (TESTING.md §6) belong in .env.test; if they're only in .env.local,
  // take just these four names from it (never the database or any other value).
  if (existsSync(".env.local")) {
    const local = parse(readFileSync(".env.local"));
    for (const name of CLERK_TEST_USER_VARS) {
      if (!process.env[name] && local[name]) process.env[name] = local[name];
    }
  }
  // Enquiry emails from e2e go to Resend's test inbox only, whatever .env.test says.
  process.env.ENQUIRY_NOTIFY_TO = "delivered@resend.dev";
}

loadTestEnv();

// PW_CHANNEL=chrome runs the tests in the installed Google Chrome (for Macs where Playwright's
// bundled Chromium won't launch, e.g. macOS 12). Unset: the bundled Chromium.
const channel = process.env.PW_CHANNEL || undefined;
const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

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
  // Clerk testing token for the signed-in admin tests (TESTING.md §6).
  globalSetup: "./tests/e2e/setup/global-setup.ts",
  projects: [
    // Public site: no Clerk sign-in needed.
    {
      name: "desktop",
      testIgnore: [/admin(-[a-z-]+)?\.spec\.ts/, /setup\//],
      use: { ...devices["Desktop Chrome"], channel, viewport: desktop },
    },
    {
      name: "mobile",
      testIgnore: [/admin(-[a-z-]+)?\.spec\.ts/, /setup\//],
      use: { ...devices["Pixel 7"], channel, viewport: mobile },
    },
    // Admin: signs the Clerk test users in once (playwright/.auth/*.json), then runs admin.spec.
    { name: "admin-setup", testMatch: /setup\/auth\.setup\.ts/, use: { channel } },
    {
      name: "admin-desktop",
      testMatch: /admin(-[a-z-]+)?\.spec\.ts/,
      dependencies: ["admin-setup"],
      use: { ...devices["Desktop Chrome"], channel, viewport: desktop },
    },
    {
      name: "admin-mobile",
      testMatch: /admin(-[a-z-]+)?\.spec\.ts/,
      dependencies: ["admin-setup"],
      use: { ...devices["Pixel 7"], channel, viewport: mobile },
    },
  ],
  // start the app automatically unless testing a deployed URL
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${port}`,
        url: baseURL,
        timeout: 240_000,
        // Never reuse a server already on :3000 — it may be `npm run dev` on the dev database.
        // If the port is busy, Playwright stops with an error instead.
        reuseExistingServer: false,
      },
});
