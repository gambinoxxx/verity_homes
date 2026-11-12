// About (Unit 10) and Privacy pages. Settings and partners come from the TEST branch
// (`npm run db:test:reset` → scripts/e2e-test-settings.ts adds two non-public [E2E] partners:
// one published without consent, one consented draft). They must be in place before the app is
// built: settings and partners are cached and the pages prerendered.
import { test, expect } from "@playwright/test";
import { getPartnerRows, getSettingsRow, type PartnerRow, type SettingsRow } from "./helpers/db";

let settings: SettingsRow;
let partners: PartnerRow[];

test.beforeAll(async () => {
  [settings, partners] = await Promise.all([getSettingsRow(), getPartnerRows()]);
});

// After a client-side navigation Next 16 keeps the previous page mounted but hidden
// (<Activity>), so headings are found by role (visible only), not by a bare "h1" locator.
test.describe("about page", () => {
  test("title and description name the company, RC number and Lagos", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveTitle("About us — Verity Homes and Properties");
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toContain(`RC ${settings.rcNumber}`);
    expect(description).toContain("Lagos");
  });

  test("CAC card shows company, RC number and office area from settings", async ({ page }) => {
    await page.goto("/about");
    const card = page.getByTestId("cac-card");
    await expect(
      card.getByRole("heading", { name: "A registered Nigerian company" }),
    ).toBeVisible();
    // <dl> pairs: each <dt> is followed by its <dd>.
    const value = (label: string) => card.locator(`dt:text-is("${label}") + dd`);
    await expect(value("Company")).toHaveText(settings.companyName);
    await expect(value("RC number")).toHaveText(settings.rcNumber);
    await expect(value("Office")).toHaveText(settings.officeArea);
  });

  test("the private office address never appears", async ({ page }) => {
    test.skip(!settings.officeAddress, "No private officeAddress — run npm run db:test:reset.");
    expect(settings.showFullAddress).toBe(false);
    const res = await page.goto("/about");
    expect((await res?.text()) ?? "").not.toContain(settings.officeAddress!);
  });

  test("partners: only published + consented ones show; hidden when there are none", async ({
    page,
  }) => {
    const hidden = partners.filter((p) => p.status !== "PUBLISHED" || !p.consentConfirmed);
    test.skip(
      hidden.length === 0,
      "No non-public [E2E] partners on the test branch — run npm run db:test:reset.",
    );
    const visible = partners.filter((p) => p.status === "PUBLISHED" && p.consentConfirmed);
    const res = await page.goto("/about");
    const html = (await res?.text()) ?? "";
    for (const p of hidden) expect(html, `${p.name} must not be public`).not.toContain(p.name);

    const label = page.getByText("Our development partners");
    if (visible.length === 0) {
      await expect(label).toHaveCount(0);
      await expect(page.locator("[data-partners]")).toHaveCount(0);
    } else {
      await expect(label).toBeVisible();
      for (const p of visible) expect(html).toContain(p.name);
    }
  });

  test("CTA: Contact us goes to the contact form", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "Contact us", exact: true }).click();
    await expect(page).toHaveURL(/\/contact#message$/);
    await expect(page.locator("#message")).toBeVisible();
  });

  test("CTA: View properties goes to /properties", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("link", { name: "View properties", exact: true }).click();
    await expect(page).toHaveURL(/\/properties$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Book a consultation goes to the contact form", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("link", { name: "Book a consultation" })).toHaveAttribute(
      "href",
      "/contact#message",
    );
  });

  test("home 'About Verity' and footer 'About' links open /about", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "About Verity" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Verity");

    await page.goto("/contact");
    await page.locator("footer").getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("header About link opens /about and is marked current", async ({ page, isMobile }) => {
    await page.goto("/contact");
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = isMobile
      ? page.getByRole("dialog", { name: "Menu" })
      : page.getByRole("navigation", { name: "Main" });
    await nav.getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    if (!isMobile)
      await expect(
        page.getByRole("banner").getByRole("link", { name: "About", exact: true }),
      ).toHaveAttribute("aria-current", "page");
  });
});

test.describe("privacy page", () => {
  test("is linked from the footer and shows the draft banner", async ({ page }) => {
    await page.goto("/about");
    await page.locator("footer").getByRole("link", { name: "Privacy policy" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.getByTestId("privacy-draft-banner")).toHaveText(
      "Draft — to be reviewed by Verity Homes and Properties before launch.",
    );
    // The banner sits above the notice text.
    const [bannerY, firstH2Y] = await Promise.all([
      page.getByTestId("privacy-draft-banner").evaluate((el) => el.getBoundingClientRect().top),
      page
        .locator(".prose h2")
        .first()
        .evaluate((el) => el.getBoundingClientRect().top),
    ]);
    expect(bannerY).toBeLessThan(firstH2Y);
  });

  test("footer has no Terms link", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("footer").getByRole("link", { name: /terms/i })).toHaveCount(0);
  });

  test("title, company, RC number and privacy contact come from settings", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveTitle("Privacy policy — Verity Homes and Properties");
    const notice = page.locator("article");
    await expect(notice).toContainText(`${settings.companyName} (RC ${settings.rcNumber})`);
    await expect(notice).toContainText("Last updated:");
    if (settings.email) {
      await expect(notice.locator(`a[href="mailto:${settings.email}"]`).first()).toBeVisible();
    }
  });

  test("lists the processors and the NDPC complaint route", async ({ page }) => {
    await page.goto("/privacy");
    const notice = page.locator("article");
    for (const name of ["Neon", "Vercel", "Resend", "Google Maps"])
      await expect(notice.getByText(name, { exact: true })).toBeVisible();
    await expect(notice).toContainText("Nigeria Data Protection Commission");
    await expect(notice).toContainText("We do not store your IP address itself.");
  });
});
