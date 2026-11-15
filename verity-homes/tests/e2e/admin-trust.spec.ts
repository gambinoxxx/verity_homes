import { randomUUID } from "node:crypto";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { blobExists } from "./helpers/blob";
import {
  cleanUpE2eRows,
  cleanUpE2eTrust,
  countSubscribers,
  partnerByName,
  testimonialByName,
} from "./helpers/db";
import { clickAndWaitForAction, expectSavedEditor, readyForm } from "./helpers/editor";
import { storageStateFor } from "./setup/clerk-users";

// Unit 19b: testimonials, partners and newsletter subscribers admin, against the TEST database.
// Rows are "[SAMPLE] E2E …" / @e2e-test.example (unique per run) and removed afterwards; logo
// uploads go under e2e/partners/<id>/ (the global teardown sweeps anything left).
// Publishing changes the home page and /about for everyone, so those two flows run on the
// desktop project only (like the plans flows).

const LOGO = path.resolve("brand/web-icons/icon-192.png"); // 192×192 RGBA PNG (transparent)
const names: string[] = [];
const emails: string[] = [];

test.afterAll(async () => {
  await cleanUpE2eTrust(names);
  await cleanUpE2eRows([], emails);
});

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });
}

const desktopOnly = (page: Page) =>
  test.skip(page.viewportSize()!.width < 800, "site-wide changes: desktop project only");

test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("testimonial: publish is blocked without consent → tick → on the home page → untick → gone", async ({
    page,
    request,
  }) => {
    desktopOnly(page);
    test.setTimeout(120_000);
    const name = `[SAMPLE] E2E Client ${randomUUID().slice(0, 8)}`;
    names.push(name);
    const ed = readyForm(page, "Testimonial editor");

    await page.goto("/admin/testimonials/new");
    await expect(page.getByRole("heading", { level: 1, name: "Add testimonial" })).toBeVisible();
    await ed.getByLabel("Client's name", { exact: true }).fill(name);
    await ed.getByLabel("Service used", { exact: true }).fill("Home buyer");
    await ed.getByLabel("Quote", { exact: true }).fill("x".repeat(395));
    await expect(ed.getByTestId("quote-counter")).toHaveText("395 / 400");
    await ed
      .getByLabel("Quote", { exact: true })
      .fill("E2E: they told us the truth at every step.");
    await ed.getByLabel("Rating (optional)", { exact: true }).selectOption("5");
    await clickAndWaitForAction(page, ed.getByRole("button", { name: "Save draft" }));
    await expectToast(page, /Draft saved/);
    await expectSavedEditor(ed);
    expect(await testimonialByName(name)).toMatchObject({
      status: "DRAFT",
      consentConfirmed: false,
    });

    // ---- Publish without consent → blocked, with the clear message ----
    await ed.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(ed.getByTestId("consent-error")).toHaveText(
      "Tick “The client gave written permission to publish this” before publishing.",
    );
    await expect(ed.getByRole("checkbox", { name: /written permission/ })).toBeFocused();
    expect((await testimonialByName(name))?.status).toBe("DRAFT");
    expect(await (await request.get("/")).text()).not.toContain(name);

    // ---- Tick consent → publish → in the home carousel ----
    await ed.getByRole("checkbox", { name: /written permission/ }).check();
    await clickAndWaitForAction(page, ed.getByRole("button", { name: "Publish", exact: true }));
    await expectToast(page, /Published/);
    expect(await testimonialByName(name)).toMatchObject({
      status: "PUBLISHED",
      consentConfirmed: true,
    });
    const home = await page.context().newPage();
    await home.goto("/");
    const carousel = home.getByRole("region", { name: "Clients who trusted Verity" });
    await expect(carousel.getByText(name).first()).toBeAttached();
    await expect(
      carousel.getByText("E2E: they told us the truth at every step.").first(),
    ).toBeAttached();

    // ---- Untick consent → save → unpublished, gone from the home page ----
    await expect(ed.getByText("On the home page")).toBeVisible(); // the published editor
    await ed.getByRole("checkbox", { name: /written permission/ }).uncheck();
    await clickAndWaitForAction(page, ed.getByRole("button", { name: "Save changes" }));
    await expectToast(page, /unpublished, because the client's permission/);
    expect(await testimonialByName(name)).toMatchObject({
      status: "DRAFT",
      consentConfirmed: false,
    });
    await home.goto("/");
    await expect(home.getByText(name)).toHaveCount(0);
    await home.close();

    // ---- Delete (the dialog names the client) ----
    await ed.getByRole("button", { name: "Delete testimonial" }).click();
    const dialog = page.getByRole("dialog", { name: `Delete “${name}”?` });
    await clickAndWaitForAction(page, dialog.getByRole("button", { name: "Delete testimonial" }));
    await expect(page).toHaveURL(/\/admin\/testimonials$/);
    expect(await testimonialByName(name)).toBeNull();
  });

  test("partner: logo upload → publish → on home and /about, links out → delete → Blob file gone", async ({
    page,
    request,
  }) => {
    desktopOnly(page);
    test.setTimeout(150_000);
    const token = randomUUID().slice(0, 8);
    const name = `[SAMPLE] E2E Partner ${token}`;
    const website = `https://example.com/e2e-${token}`;
    names.push(name);
    const ed = readyForm(page, "Partner editor");

    await page.goto("/admin/partners/new");
    await ed.getByLabel("Partner name", { exact: true }).fill(name);
    await ed.getByLabel("Website (optional)", { exact: true }).fill("http://example.com");
    await ed.getByRole("button", { name: "Save draft" }).click(); // refused before any request
    await expect(
      ed.getByText("Use the https:// address, e.g. https://example.com").first(),
    ).toBeVisible();
    await ed.getByLabel("Website (optional)", { exact: true }).fill(website);
    await clickAndWaitForAction(page, ed.getByRole("button", { name: "Save draft" }));
    await expectToast(page, /Draft saved/);
    await expectSavedEditor(ed);

    // ---- Logo: PNG with transparency, uploaded to e2e/partners/<id>/ ----
    await ed.getByTestId("image-file-input").setInputFiles(LOGO);
    await expect(ed.getByRole("button", { name: "Replace logo" })).toBeVisible({ timeout: 60_000 });
    await ed.getByRole("checkbox", { name: /permission to display this logo/ }).check();
    await clickAndWaitForAction(page, ed.getByRole("button", { name: "Publish", exact: true }));
    await expectToast(page, /Published/);
    const row = await partnerByName(name);
    expect(row).toMatchObject({ status: "PUBLISHED", consentConfirmed: true });
    expect(row?.logoUrl).toMatch(
      new RegExp(`\\.public\\.blob\\.vercel-storage\\.com/e2e/partners/${row!.id}/`),
    );
    expect(await blobExists(row!.logoUrl!)).toBe(true);

    // ---- Home and /about: the logo links to the website in a new tab ----
    const pub = await page.context().newPage();
    for (const p of ["/", "/about"]) {
      await pub.goto(p);
      const link = pub.getByRole("link", { name: `${name} (opens in a new tab)` });
      await expect(link, p).toHaveAttribute("href", website);
      await expect(link, p).toHaveAttribute("target", "_blank");
      await expect(link, p).toHaveAttribute("rel", "noopener noreferrer");
      await expect(link.locator(`img[alt="${name}"]`), p).toHaveAttribute(
        "src",
        new RegExp(`e2e%2Fpartners%2F${row!.id}`),
      );
    }

    // ---- Delete → gone from the site, and its Blob file removed ----
    await ed.getByRole("button", { name: "Delete partner" }).click();
    const dialog = page.getByRole("dialog", { name: `Delete “${name}”?` });
    await clickAndWaitForAction(page, dialog.getByRole("button", { name: "Delete partner" }));
    await expect(page).toHaveURL(/\/admin\/partners$/);
    expect(await partnerByName(name)).toBeNull();
    expect(await blobExists(row!.logoUrl!)).toBe(false); // the action awaited the clean-up
    expect(await (await request.get("/about")).text()).not.toContain(name);
    await pub.close();
  });

  test("subscriber: footer sign-up → in the admin list → in the CSV → delete → gone", async ({
    page,
    browser,
    baseURL,
  }) => {
    const email = `e2e-sub-${randomUUID().slice(0, 8)}@e2e-test.example`;
    emails.push(email);
    const n = () => Math.floor(Math.random() * 250) + 1;
    const visitor = await browser.newContext({ baseURL }); // signed out, like a visitor
    const site = await visitor.newPage();
    await site.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${n()}, 10.0.${n()}.${n()}` });
    await site.goto("/");
    const input = site.getByLabel("Email for new listings");
    await input.scrollIntoViewIfNeeded();
    await input.fill(email);
    await site.getByRole("button", { name: "Subscribe" }).click();
    await expect(site.getByText("You're on the list", { exact: false })).toBeVisible();
    await visitor.close();
    expect(await countSubscribers(email)).toBe(1);

    await page.goto(`/admin/subscribers?q=${encodeURIComponent(email)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Subscribers" })).toBeVisible();
    const rows = page.getByRole("region", { name: "Subscribers" }).locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(email);
    await expect(rows.first().locator("time")).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);

    const csv = await page.request.get(
      `/api/admin/subscribers/export?q=${encodeURIComponent(email)}`,
    );
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const text = await csv.text();
    expect(text).toContain("Joined (Lagos),Email");
    expect(text).toContain(email);

    await rows
      .first()
      .getByRole("button", { name: `Delete ${email}` })
      .click();
    const dialog = page.getByRole("dialog", { name: `Delete “${email}”?` });
    await clickAndWaitForAction(page, dialog.getByRole("button", { name: "Delete subscriber" }));
    await expect(page.getByText("No subscribers match")).toBeVisible();
    expect(await countSubscribers(email)).toBe(0);
  });

  test("lists render; new editors ask to save before an image", async ({ page }) => {
    for (const [url, h1] of [
      ["/admin/testimonials", "Testimonials"],
      ["/admin/partners", "Partners"],
    ] as const) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeVisible();
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scroll).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await page.goto("/admin/partners/new");
    await expect(readyForm(page, "Partner editor").getByTestId("image-save-first")).toContainText(
      "Save the draft first to add a logo.",
    );
  });
});

test.describe("access", () => {
  test("viewer: 403 on the CSV export; signed out: 401", async ({ browser, baseURL }) => {
    const viewer = await browser.newContext({ baseURL, storageState: storageStateFor("viewer") });
    expect((await viewer.request.get("/api/admin/subscribers/export")).status()).toBe(403);
    await viewer.close();
    const anon = await browser.newContext({ baseURL });
    expect((await anon.request.get("/api/admin/subscribers/export")).status()).toBe(401);
    await anon.close();
  });
});
