import { test, expect } from "@playwright/test";

// Signed-out protection — runs without any Clerk setup.
for (const path of ["/admin", "/admin/properties", "/admin/enquiries", "/admin/properties/new"]) {
  test(`signed-out visitor to ${path} is sent to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });
}

test("admin pages are not indexable", async ({ page }) => {
  await page.goto("/admin/sign-in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

/* Signed-in flows (Unit 12+): enable after setting up @clerk/testing — see testing/TESTING.md §6.
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

test.describe("signed-in admin", () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/admin/sign-in");
    await clerk.signIn({ page, signInParams: { strategy: "password", identifier: process.env.E2E_CLERK_USER_USERNAME!, password: process.env.E2E_CLERK_USER_PASSWORD! } });
  });

  test("create a draft property, publish it, see it on the site", async ({ page }) => {
    await page.goto("/admin/properties/new");
    await page.getByLabel("Title").fill("[SAMPLE] E2E Test Home");
    await page.getByLabel("Area").fill("Yaba");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();
    // draft must NOT be public
    const draft = await page.request.get("/properties/sample-e2e-test-home");
    expect(draft.status()).toBe(404);
    await page.getByRole("button", { name: "Publish" }).click();
    await page.goto("/properties/sample-e2e-test-home");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/E2E Test Home/);
  });

  test("enquiry can be marked contacted", async ({ page }) => {
    await page.goto("/admin/enquiries");
    await page.getByRole("row").nth(1).click();
    await page.getByRole("button", { name: "Mark contacted" }).click();
    await expect(page.getByText("Contacted").first()).toBeVisible();
  });
});
*/
