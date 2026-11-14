import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { cleanUpE2eProperties, findPropertyByTitle } from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";
import { neon } from "@neondatabase/serverless";

// Unit 17b: an estate with plot options, end to end on the TEST database. The listing is
// "[SAMPLE] E2E Estate …" and is removed in a finally (the global teardown also sweeps it and
// the "[SAMPLE] E2E …" enquiry). Desktop only: it publishes a listing site-wide.

const db = () => neon(process.env.DATABASE_URL!);

const PLOTS = [
  { size: "300", price: "18000000", deposit: "1000000", suitable: "Duplexes" },
  { size: "500", price: "30000000", deposit: "1000000", suitable: "Duplexes" },
  { size: "600", price: "36000000", deposit: "1000000", suitable: "Duplexes" },
  { size: "1000", price: "70000000", deposit: "5000000", suitable: "Commercial & apartments" },
];

const editor = (page: Page) => page.getByRole("form", { name: "Property editor" });
const byId = (page: Page, id: string) => editor(page).locator(`[id$="f-${id}"]`);
const toast = (page: Page, text: RegExp) =>
  expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });

test.use({ storageState: storageStateFor("admin") });

test("estate with 4 plots: admin → card “From” → page → select 500 sqm → enquiry → filter → offer ends", async ({
  page,
}) => {
  test.skip(
    page.viewportSize()!.width < 800,
    "publishes a listing site-wide: desktop project only",
  );
  test.setTimeout(240_000);
  const token = randomUUID().slice(0, 8);
  const title = `[SAMPLE] E2E Estate ${token}`;
  try {
    // ---- Admin: create the estate with 4 plots and the estate notes ----
    await page.goto("/admin/properties/new");
    await byId(page, "title").fill(title);
    await editor(page).getByLabel("Listing type").selectOption("LAND");
    await editor(page).getByLabel("Property type").selectOption("LAND");
    await byId(page, "area").fill("Lekki");
    const panel = editor(page).getByTestId("plot-options");
    for (const [i, p] of PLOTS.entries()) {
      await panel.getByRole("button", { name: "Add a plot size" }).click();
      await byId(page, `plots-${i}-sizeSqm`).fill(p.size);
      await byId(page, `plots-${i}-price`).pressSequentially(p.price);
      await byId(page, `plots-${i}-deposit`).pressSequentially(p.deposit);
      await byId(page, `plots-${i}-suitableFor`).fill(p.suitable);
    }
    await expect(byId(page, "plots-0-price")).toHaveValue("18,000,000");
    // With plots, the single price is off, with a note.
    await expect(editor(page).getByTestId("price-from-plots")).toBeVisible();
    await expect(byId(page, "price")).toBeDisabled();
    await byId(page, "developerName").fill("[SAMPLE] E2E Developer");
    await byId(page, "paymentPlan").fill("6 months interest-free");
    await byId(page, "offerNote").fill("Pay ₦5M for immediate physical allocation");
    await byId(page, "offerEndsAt").fill("2099-12-31");
    await byId(page, "termsNote").fill("Possession of the land is subject to full payment.");
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await toast(page, /Draft saved/);
    await expect(page).toHaveURL(/\/admin\/properties\/(?!new$)[a-z0-9]+$/);
    await editor(page).getByRole("button", { name: "Publish", exact: true }).click();
    await toast(page, /Published/);
    const row = await findPropertyByTitle(title);
    expect(row?.status).toBe("PUBLISHED");
    const slug = row!.slug;

    // ---- /properties card: “From ₦18,000,000”, “300–1,000 sqm” ----
    const pub = await page.context().newPage();
    await pub.goto(`/properties?q=${token}`);
    const card = pub.locator("article", { hasText: title });
    await expect(card).toContainText("From ₦18,000,000");
    await expect(card).toContainText("300–1,000 sqm");

    // ---- Property page: head, 4 plots, notes ----
    await pub.goto(`/properties/${slug}`);
    await expect(pub.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(pub.getByText("From ₦18,000,000").first()).toBeVisible();
    await expect(pub.getByText("Initial deposit from ₦1,000,000")).toBeVisible();
    await expect(pub.getByTestId("developer")).toHaveText(
      /A development by \[SAMPLE\] E2E Developer/,
    );
    const plots = pub.getByRole("table", { name: "Plot options" }).locator("[data-plot-size]");
    await expect(plots).toHaveCount(4);
    await expect(plots.nth(3)).toContainText("₦70,000,000");
    await expect(plots.nth(3)).toContainText("₦5,000,000");
    await expect(plots.nth(3)).toContainText("Commercial & apartments");
    await expect(pub.getByTestId("estate-terms")).toContainText("6 months interest-free");
    await expect(pub.getByTestId("offer-note")).toContainText(
      "Pay ₦5M for immediate physical allocation",
    );
    await expect(pub.getByTestId("estate-terms")).toContainText("subject to full payment");

    // ---- Select 500 sqm → form message + plotId, scrolled to #enquire → send ----
    await pub
      .locator('[data-plot-size="500"]')
      .getByRole("button", { name: /Select/ })
      .click();
    await expect(pub.locator('[data-plot-size="500"]').getByRole("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(pub.locator("#enquire")).toBeInViewport();
    const form = pub.getByRole("form", { name: /enquire about this property/i });
    await expect(form.getByLabel("Message")).toHaveValue(/500 sqm plot at .*₦30,000,000/);
    const plotId = await form.getByTestId("plot-id").inputValue();
    expect(plotId).toMatch(/^[a-z0-9]+$/);
    await pub.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Date.now() % 250}` });
    await form.getByLabel(/full name/i).fill(`[SAMPLE] E2E Buyer ${token}`);
    await form.getByLabel(/phone/i).fill("08030000000");
    await pub.waitForTimeout(3_100); // minimum fill time (anti-bot)
    await form.getByRole("button", { name: /send enquiry/i }).click();
    await expect(pub.getByRole("status").filter({ hasText: /thank you/i })).toBeVisible({
      timeout: 20_000,
    });
    const saved = (await db()`
      SELECT e."plotId", e.message, p."sizeSqm" FROM "Enquiry" e JOIN "PropertyPlot" p ON p.id = e."plotId"
      WHERE e.name = ${`[SAMPLE] E2E Buyer ${token}`}`) as {
      plotId: string;
      message: string;
      sizeSqm: number;
    }[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ plotId, sizeSqm: 500 });
    expect(saved[0]!.message).toContain("500 sqm plot");

    // ---- The admin inbox shows the plot ----
    const inbox = await page.context().newPage();
    await inbox.goto(`/admin/enquiries?q=${encodeURIComponent(`E2E Buyer ${token}`)}`);
    const inboxRow = inbox.locator("tbody tr", { hasText: `E2E Buyer ${token}` });
    await expect(inboxRow).toContainText("500 sqm plot");
    await inboxRow.getByRole("link", { name: new RegExp(`E2E Buyer ${token}`) }).click();
    await expect(inbox.getByTestId("enquiry-plot")).toHaveText(
      "500 sqm plot — ₦30,000,000 (deposit ₦1,000,000)",
    );
    await inbox.close();

    // ---- Price filter: min ₦25M still finds it (its ₦30M+ plots); max ₦10M doesn't ----
    await pub.goto(`/properties?q=${token}&min=25000000`);
    await expect(pub.locator("article", { hasText: title })).toHaveCount(1);
    await pub.goto(`/properties?q=${token}&max=10000000`);
    await expect(pub.locator("article", { hasText: title })).toHaveCount(0);

    // ---- The offer hides after offerEndsAt ----
    await page.reload();
    await byId(page, "offerEndsAt").fill("2020-01-01");
    await editor(page).getByRole("button", { name: "Save changes" }).click();
    await toast(page, /Changes saved/);
    await pub.goto(`/properties/${slug}`);
    await expect(pub.getByTestId("estate-terms")).toContainText("6 months interest-free");
    await expect(pub.getByTestId("offer-note")).toHaveCount(0);
    await pub.close();
  } finally {
    await db()`DELETE FROM "Enquiry" WHERE name = ${`[SAMPLE] E2E Buyer ${token}`}`;
    await cleanUpE2eProperties([title]);
  }
});

test("the seeded sample estate shows its plots on mobile as stacked cards", async ({ page }) => {
  test.skip(page.viewportSize()!.width > 800, "phones only");
  const rows =
    (await db()`SELECT slug FROM "Property" WHERE slug = 'sample-palm-estate-plots'`) as {
      slug: string;
    }[];
  test.skip(rows.length === 0, "sample estate not seeded in this database");
  await page.goto("/properties/sample-palm-estate-plots");
  const plots = page.getByRole("table", { name: "Plot options" }).locator("[data-plot-size]");
  await expect(plots).toHaveCount(4);
  // Stacked: each card spans the content width; no sideways scrolling.
  const box = await plots.first().boundingBox();
  expect(box!.width).toBeGreaterThan(page.viewportSize()!.width * 0.8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await expect(plots.first().getByRole("button", { name: /Select/ })).toBeVisible();
});
