// Contact page (Unit 8). Settings come from the TEST branch: `npm run db:test:reset` ends with
// scripts/e2e-test-settings.ts, which sets fake phone/email/WhatsApp, a fake private address and
// showFullAddress=false. They must be in place before the app is built: SiteSettings is cached
// and the page prerendered, so changing them inside a test would never reach the page. The
// "nothing set" state is covered on the same component in tests/unit/contact-cards.test.ts.
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { cleanUpE2eRows, findEnquirySource, getSettingsRow, type SettingsRow } from "./helpers/db";

let settings: SettingsRow;
const created: string[] = [];

test.beforeAll(async () => {
  settings = await getSettingsRow();
});
test.afterAll(async () => {
  await cleanUpE2eRows(created, []);
});

test("map iframe uses output=embed and the settings map query", async ({ page }) => {
  await page.goto("/contact");
  const map = page.locator('iframe[title^="Map showing our office area"]');
  await expect(map).toHaveAttribute("title", `Map showing our office area in ${settings.mapQuery}`);
  const src = (await map.getAttribute("src")) ?? "";
  expect(src).toContain("output=embed");
  expect(src).toContain(`q=${encodeURIComponent(settings.mapQuery)}`);
  await expect(page.getByRole("link", { name: "Open in Maps" })).toHaveAttribute(
    "href",
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.mapQuery)}`,
  );
});

test("email, call and WhatsApp buttons use the settings values", async ({ page }) => {
  test.skip(
    !settings.phone || !settings.email || !settings.whatsapp,
    "Fake contact details missing on the test branch — run npm run db:test:reset.",
  );
  await page.goto("/contact");
  await expect(page.getByRole("link", { name: "Send an email" })).toHaveAttribute(
    "href",
    `mailto:${settings.email}`,
  );
  const digits = settings.phone!.replace(/\D/g, "");
  await expect(page.getByRole("link", { name: "Call us" })).toHaveAttribute(
    "href",
    `tel:+${digits}`,
  );
  // The card's button (exact name), not the header's "WhatsApp us" or the round float.
  const wa = page.getByRole("link", { name: "WhatsApp", exact: true });
  await expect(wa).toHaveAttribute(
    "href",
    `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("Hi Verity, I'd like to make an enquiry")}`,
  );
  // The header button goes straight to WhatsApp when a number is set. (CSS locator: on mobile
  // the button is hidden by design, which getByRole would skip.)
  await expect(page.locator("header a", { hasText: "WhatsApp us" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\//,
  );
});

test("the full office address never appears while showFullAddress is off", async ({ page }) => {
  test.skip(
    !settings.officeAddress,
    "No private officeAddress on the test branch — run npm run db:test:reset.",
  );
  expect(settings.showFullAddress).toBe(false);
  const res = await page.goto("/contact");
  const html = (await res?.text()) ?? "";
  expect(html).not.toContain(settings.officeAddress!);
  await expect(page.getByText(settings.officeArea).first()).toBeVisible();
  expect(await page.content()).not.toContain(settings.officeAddress!);
});

test("the form submits with source CONTACT_PAGE", async ({ page }) => {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${n()}` });
  await page.goto("/contact#message");
  const form = page.getByRole("form", { name: "Contact form" });
  const last = `[E2E] ${randomUUID().slice(0, 8)}`;
  await form.getByLabel(/First name/).fill("Contact");
  await form.getByLabel("Last name").fill(last);
  await form.getByLabel(/Phone \/ WhatsApp/).fill("08030000000");
  await form.getByLabel("I'm interested in").selectOption({ label: "Listing my property" });
  await form.getByLabel("Message").fill("E2E contact page test — please ignore.");
  await page.waitForTimeout(3_100); // minimum fill time (anti-bot)
  await form.getByRole("button", { name: "Get a call back" }).click();
  await expect(form.getByRole("status")).toContainText(/thank you/i, { timeout: 20_000 });

  const name = `Contact ${last}`; // first + last name are sent together as `name`
  created.push(name);
  expect(await findEnquirySource(name)).toBe("CONTACT_PAGE");
});

test("empty submit shows errors on the first-name and phone fields", async ({ page }) => {
  await page.goto("/contact#message");
  const form = page.getByRole("form", { name: "Contact form" });
  await form.getByRole("button", { name: "Get a call back" }).click();
  const first = form.getByLabel(/First name/);
  await expect(first).toHaveAccessibleDescription("Enter your name");
  await expect(first).toBeFocused();
  await expect(form.getByLabel(/Phone \/ WhatsApp/)).toHaveAccessibleDescription(
    "Enter your phone number",
  );
});
