import { test, expect } from "@playwright/test";

// Seeded [SAMPLE] property with showExactLocation = false and area "Lekki"
const SLUG = "/properties/sample-contemporary-detached-duplex";

test("gallery opens a lightbox, arrows work, Esc closes and returns focus", async ({ page }) => {
  await page.goto(SLUG);
  const first = page.getByRole("button", { name: /open photo 1/i });
  await first.click();
  const dialog = page.getByRole("dialog", { name: /photo gallery/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/^1 \/ \d+$/)).toBeVisible();
  await dialog.getByRole("button", { name: /next photo/i }).click();
  await expect(dialog.getByText(/^2 \/ \d+$/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(first).toBeFocused();
});

test("map shows the area, never the private address", async ({ page }) => {
  await page.goto(SLUG);
  const map = page.locator('iframe[title*="map" i]');
  await expect(map).toHaveCount(1);
  const src = await map.getAttribute("src");
  expect(src).toContain("output=embed");
  expect(decodeURIComponent(src ?? "")).toContain("Lekki, Lagos");
  await expect(page.getByRole("link", { name: /open in google maps/i })).toHaveAttribute(
    "href",
    /google\.com\/maps\/search/,
  );
  // the seeded private address must not appear anywhere in the HTML
  expect(await page.content()).not.toContain("[SAMPLE PRIVATE ADDRESS]");
});

test("WhatsApp link names the property", async ({ page }) => {
  await page.goto(SLUG);
  const wa = page.getByRole("link", { name: /chat on whatsapp/i }).first();
  const href = (await wa.getAttribute("href")) ?? "";
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  expect(decodeURIComponent(href)).toContain("Contemporary Detached Duplex");
});

// FIXME(Unit 7): the property enquiry form is built (Unit 6) but not connected — submit stays
// disabled with "Form goes live soon" until Unit 7 adds the server action. Remove the fixme then.
test.fixme("enquiry form validates, then succeeds", async ({ page }) => {
  await page.goto(SLUG);
  const form = page.getByRole("form", { name: /enquire about this property/i });
  await form.getByRole("button", { name: /send enquiry/i }).click();
  await expect(form.getByText(/name is required|enter your name/i)).toBeVisible();
  await form.getByLabel(/full name/i).fill("Playwright Tester");
  await form.getByLabel(/phone/i).fill("08030000000");
  await page.waitForTimeout(3_100); // minimum fill time (anti-bot)
  await form.getByRole("button", { name: /send enquiry/i }).click();
  await expect(page.getByRole("status")).toContainText(/thank you/i);
});

test("mobile shows the bottom enquiry bar", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile only");
  await page.goto(SLUG);
  await expect(page.getByRole("link", { name: /^enquire$/i })).toBeVisible();
});

test("unknown property slug returns 404", async ({ page }) => {
  const res = await page.goto("/properties/does-not-exist-xyz");
  expect(res?.status()).toBe(404);
});
