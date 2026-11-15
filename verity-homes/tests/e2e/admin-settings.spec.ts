import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  restoreSettings,
  settingsRow,
  snapshotSettings,
  type SettingsSnapshot,
} from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";
import { readyForm } from "./helpers/editor";

// Unit 19a: /admin/settings against the TEST database. Settings change what EVERY page shows, so
// this file never runs alongside other specs: `npm run test:e2e:settings` (PW_SETTINGS=1, see
// playwright.config.ts) runs it alone, serially. The original row is saved in beforeAll and written back in afterAll — which runs
// even when a test fails — then saved once more through the admin form so the cache is
// refreshed too.
//
// How "no redeploy" is proven: the e2e server is a production build (`next build && next
// start`) whose public pages were prerendered with the fixture settings. Each test first checks
// the raw server HTML still has the OLD value, saves in the admin, then fetches the raw HTML
// again from the same running server: the only way it can change is the action's
// updateTag("settings") invalidating the cached pages.

test.describe.configure({ mode: "serial" });
test.use({ storageState: storageStateFor("admin") });

let original: SettingsSnapshot;

test.beforeAll(async () => {
  original = await snapshotSettings();
});

test.afterAll(async ({ browser }) => {
  // 1) The row itself, whatever happened above.
  await restoreSettings(original);
  // 2) Re-save it through the admin so updateTag() drops the cached pages too.
  const context = await browser.newContext({ storageState: storageStateFor("admin") });
  try {
    const page = await context.newPage();
    await page.goto("/admin/settings");
    await saveSettings(page);
  } finally {
    await context.close();
  }
});

const form = (page: Page) => readyForm(page, "Site settings");
const field = (page: Page, label: string) => form(page).getByLabel(label, { exact: true });

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Clicks Save and waits for THIS save's server-action response (an earlier "Settings saved"
 * toast may still be on screen, so the toast alone doesn't prove this save finished).
 */
async function saveSettings(page: Page) {
  const done = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/admin/settings",
  );
  await page.getByRole("button", { name: "Save settings" }).click();
  expect((await done).ok()).toBe(true);
  await expectToast(page, /Settings saved/);
}

/** The server's HTML for a public page (no client JS involved). */
async function html(request: APIRequestContext, path: string): Promise<string> {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);
  return res.text();
}

const E2E_WA_INPUT = "0800 000 0019"; // fake, not a real line
const E2E_WA_DIGITS = "2348000000019";
const E2E_PHONE = "0800 000 0018";
const E2E_EMAIL = "e2e-settings@example.com";

test("contact details: header, float, footer and contact page update without a redeploy", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  // Before: the prerendered pages show the fixture values.
  for (const path of ["/", "/contact"]) {
    const before = await html(request, path);
    expect(before).toContain(`https://wa.me/${original.whatsapp}`);
    expect(before).not.toContain(E2E_WA_DIGITS);
    expect(before).not.toContain(E2E_EMAIL);
  }

  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Site settings" })).toBeVisible();
  await field(page, "WhatsApp number").fill("12345");
  await expect(form(page).getByTestId("wa-preview")).toHaveText(
    "Not a Nigerian mobile number yet.",
  );
  await field(page, "WhatsApp number").fill(E2E_WA_INPUT);
  const preview = form(page).getByTestId("wa-preview");
  await expect(preview).toContainText(`Saved as ${E2E_WA_DIGITS}`);
  await expect(preview.getByRole("link", { name: /Test link/ })).toHaveAttribute(
    "href",
    new RegExp(`^https://wa\\.me/${E2E_WA_DIGITS}\\?text=`),
  );
  await field(page, "Phone").fill(E2E_PHONE);
  await field(page, "Email").fill(E2E_EMAIL);
  await saveSettings(page);
  expect(await settingsRow()).toMatchObject({
    whatsapp: E2E_WA_DIGITS,
    phone: E2E_PHONE,
    email: E2E_EMAIL,
  });

  // After: same server, new HTML.
  // Regression (found in Unit 19a): a settings save regenerates the [slug] routes' App Shell;
  // these pages used to answer 500 until params moved inside <Suspense>.
  // The first request after the save may stream (fallback, then the content in the same
  // response), so check the page's own content is in the HTML, not the absence of the fallback.
  for (const [path, own] of [
    ["/blog/sample-property-documents-explained", "[SAMPLE] Article body in Markdown."],
    ["/properties/sample-contemporary-detached-duplex", "[SAMPLE] Contemporary Detached Duplex"],
    ["/invest/sample-starter-plan", "Choose your package"],
  ] as const) {
    const body = await html(request, path); // asserts 200
    expect(body, path).not.toContain("__next_error__");
    expect(body, path).toContain(own);
  }
  const home = await html(request, "/");
  expect(home).not.toContain(`https://wa.me/${original.whatsapp}`);
  const pub = await page.context().newPage();
  await pub.goto("/");
  const wa = new RegExp(`^https://wa\\.me/${E2E_WA_DIGITS}\\?text=`);
  await expect(pub.locator("header").getByRole("link", { name: "WhatsApp us" })).toHaveAttribute(
    "href",
    wa,
  );
  await expect(pub.getByRole("link", { name: "Chat with us on WhatsApp" })).toHaveAttribute(
    "href",
    wa,
  );
  const footer = pub.locator("footer");
  await expect(footer.getByRole("link", { name: E2E_PHONE })).toHaveAttribute(
    "href",
    `tel:${E2E_PHONE.replace(/[^\d+]/g, "")}`,
  );
  await expect(footer.getByRole("link", { name: E2E_EMAIL })).toHaveAttribute(
    "href",
    `mailto:${E2E_EMAIL}`,
  );

  await pub.goto("/contact");
  const main = pub.locator("main");
  await expect(main.getByRole("link", { name: E2E_EMAIL })).toHaveAttribute(
    "href",
    `mailto:${E2E_EMAIL}`,
  );
  await expect(main.getByText(E2E_PHONE, { exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Call us" })).toHaveAttribute(
    "href",
    "tel:+2348000000018",
  );
  await expect(main.getByRole("link", { name: "WhatsApp", exact: true })).toHaveAttribute(
    "href",
    wa,
  );
  await pub.close();
});

test("office: full address shows in the footer + contact only while the switch is on; map warning", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const address = String(original.officeAddress ?? "");
  expect(address, "fixture has a private office address").not.toBe("");
  expect(await html(request, "/contact")).not.toContain(address);

  await page.goto("/admin/settings");
  // Map search: a street address triggers the Q37 warning; the preview follows the text.
  const map = field(page, "Map search");
  await map.fill("7 Hidden Close, Onipanu");
  await expect(form(page).getByTestId("map-warning")).toContainText(
    "Use an area or landmark, not a private street address.",
  );
  await expect(form(page).getByTestId("map-preview")).toHaveAttribute(
    "src",
    /q=7%20Hidden%20Close%2C%20Onipanu/,
  );
  await map.fill(String(original.mapQuery));
  await expect(form(page).getByTestId("map-warning")).toHaveCount(0);

  // On → the warning, then footer + contact show the address.
  await form(page)
    .getByRole("switch", { name: /Show full address publicly/ })
    .check();
  await expect(form(page).getByTestId("address-warning")).toContainText(
    "This is shown on every page footer and the contact page — don't use a home address.",
  );
  await saveSettings(page);
  for (const path of ["/", "/contact"]) {
    expect(await html(request, path), path).toContain(address);
  }

  // Off → hidden again everywhere.
  await form(page)
    .getByRole("switch", { name: /Show full address publicly/ })
    .uncheck();
  await saveSettings(page);
  for (const path of ["/", "/contact", "/about", "/privacy"]) {
    const h = await html(request, path);
    expect(h, path).not.toContain(address);
    expect(h, path).toContain(String(original.officeArea));
  }
});

test("website text: CEO bio + promise on home, /about and the author box; company story on /about", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const bio = "E2E bio first paragraph with **bold** text.\n\nE2E bio second paragraph.";
  const promise = "E2E promise: the truth, every time.";
  const story = "E2E story about why Verity was started.";
  const before = await html(request, "/about");
  expect(before).toContain("[Full bio"); // the placeholder
  expect(before).not.toContain("E2E bio first paragraph");

  await page.goto("/admin/settings");
  await field(page, "CEO bio").fill(bio);
  await field(page, "CEO promise (one line)").fill(promise);
  await field(page, "Company story").fill(story);
  await saveSettings(page);

  const pub = await page.context().newPage();
  await pub.goto("/");
  await expect(pub.getByTestId("ceo-bio")).toContainText("E2E bio first paragraph with bold text.");
  await expect(pub.getByTestId("ceo-bio").locator("strong")).toHaveText("bold");
  await expect(pub.getByTestId("ceo-promise")).toHaveText(promise);
  await pub.goto("/about");
  await expect(pub.getByTestId("ceo-bio")).toContainText("E2E bio second paragraph.");
  await expect(pub.getByTestId("ceo-promise")).toHaveText(promise);
  await expect(pub.getByTestId("company-story")).toHaveText(story);
  await expect(pub.locator("main")).not.toContainText("[Full bio");
  await expect(pub.locator("main")).not.toContainText("[Company story");
  // Blog author box (Esther's posts): the bio's first paragraph only.
  await pub.goto("/blog/sample-property-documents-explained");
  const author = pub.locator("article").getByText("E2E bio first paragraph");
  await expect(author).toBeVisible();
  await expect(pub.locator("article")).not.toContainText("E2E bio second paragraph.");
  await pub.close();

  // Emptying them brings the placeholders back.
  await field(page, "CEO bio").fill("");
  await field(page, "CEO promise (one line)").fill("");
  await field(page, "Company story").fill("");
  await saveSettings(page);
  const after = await html(request, "/about");
  expect(after).toContain("[Full bio");
  expect(after).toContain("[Company story");
});

test("privacy: mark reviewed hides the Draft banner and ticks the checklist; undo brings it back", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const pub = await page.context().newPage();
  await pub.goto("/privacy");
  await expect(pub.getByTestId("privacy-draft-banner")).toBeVisible();

  await page.goto("/admin/settings#privacy");
  await page.getByRole("button", { name: "Mark privacy notice as reviewed" }).click();
  await expectToast(page, /marked as reviewed/);
  await expect(page.getByTestId("privacy-state")).toContainText("Reviewed");
  await pub.goto("/privacy");
  await expect(pub.getByTestId("privacy-draft-banner")).toHaveCount(0);
  await pub.goto("/admin");
  await expect(pub.locator('[data-item="privacy"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Mark as draft again" }).click();
  await expectToast(page, /draft again/);
  await pub.goto("/privacy");
  await expect(pub.getByTestId("privacy-draft-banner")).toBeVisible();
  await pub.goto("/admin");
  await expect(pub.locator('[data-item="privacy"] a')).toHaveAttribute(
    "href",
    "/admin/settings#privacy",
  );
  await pub.close();
});

test("socials: footer icons only for the filled ones; bad addresses are refused", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  await page.goto("/admin/settings");
  for (const label of ["Instagram", "Facebook", "X", "LinkedIn"]) await field(page, label).fill("");
  await saveSettings(page);
  expect(await html(request, "/")).not.toContain('data-testid="footer-socials"');

  await field(page, "LinkedIn").fill("https://example.com/verity");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(form(page).getByText(/That isn't a LinkedIn address/)).toBeVisible();
  await expect(field(page, "LinkedIn")).toBeFocused();
  await field(page, "LinkedIn").fill("");

  await field(page, "Instagram").fill("https://www.instagram.com/e2e-verity");
  await saveSettings(page);
  const pub = await page.context().newPage();
  await pub.goto("/");
  const socials = pub.getByTestId("footer-socials");
  await expect(socials.getByRole("link")).toHaveCount(1);
  await expect(socials.getByRole("link", { name: "Instagram" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/e2e-verity",
  );
  await pub.close();
});

test("unsaved changes: leaving asks first; validation errors are listed", async ({ page }) => {
  await page.goto("/admin/settings");
  await field(page, "Email").fill("not-an-email");
  await expect(page.getByTestId("unsaved-note")).toBeVisible();
  let asked = false;
  page.once("dialog", (d) => {
    asked = true;
    void d.dismiss();
  });
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  expect(asked).toBe(true);
  await expect(page).toHaveURL(/\/admin\/settings/);
  await page.getByRole("button", { name: "Save settings" }).click();
  const summary = page.getByRole("alert").filter({ hasText: "to fix" });
  await expect(summary.getByRole("link", { name: "Email" })).toBeVisible();
  await expect(field(page, "Email")).toBeFocused();
});
