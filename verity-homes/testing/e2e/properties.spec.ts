import { test, expect } from "@playwright/test";

test("listing-type pills filter results and update the URL", async ({ page }) => {
  await page.goto("/properties");
  const cards = page.locator("article");
  const total = await cards.count();
  expect(total).toBeGreaterThan(0);
  await page.getByRole("button", { name: "For rent", exact: true }).click();
  await expect(page).toHaveURL(/type=rent/);
  const rentCount = await cards.count();
  expect(rentCount).toBeLessThanOrEqual(total);
  for (const tag of await page.locator("article .prop-tag, article [data-tag]").allTextContents()) {
    expect(tag.toLowerCase()).toContain("rent");
  }
});

test("filters survive a reload (state lives in the URL)", async ({ page }) => {
  await page.goto("/properties?type=sale&beds=3");
  await expect(page.getByRole("button", { name: "For sale", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("bad query params do not crash the page", async ({ page }) => {
  const res = await page.goto("/properties?type=banana&beds=-4&page=abc");
  expect(res?.status()).toBe(200);
});

test("empty results show a helpful message", async ({ page }) => {
  await page.goto("/properties?q=zzzz-no-such-home");
  await expect(page.getByText(/no properties match/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /make a request|contact/i }).first()).toBeVisible();
});
