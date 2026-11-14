// /invest (Unit 9): plans from the test branch, FAQ accordion, plan preselect, enquiry row.
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { cleanUpE2eRows, findInvestEnquiry, getPlanRows } from "./helpers/db";

const created: string[] = [];

test.afterAll(async () => {
  await cleanUpE2eRows(created, []);
});

const planCards = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: /Choose your plan/ }).locator("article");

test("only published plans render; the highlighted one is the gold card", async ({ page }) => {
  // Plans are site-wide and the admin plans test (Unit 17) may change them meanwhile, so the
  // page and the database are read together until they agree.
  await expect(async () => {
    await page.goto("/invest");
    const plans = await getPlanRows();
    const published = plans.filter((p) => p.status === "PUBLISHED");
    const unpublished = plans.filter((p) => p.status !== "PUBLISHED");
    expect(published.length).toBeGreaterThan(0);
    const cards = planCards(page);
    await expect(cards).toHaveCount(published.length, { timeout: 2_000 });
    for (const p of published)
      await expect(cards.filter({ hasText: p.name })).toHaveCount(1, { timeout: 2_000 });
    for (const p of unpublished)
      await expect(cards.filter({ hasText: p.name })).toHaveCount(0, { timeout: 2_000 });

    const gold = page
      .getByRole("region", { name: /Choose your plan/ })
      .locator("article[data-highlighted]");
    const highlighted = published.filter((p) => p.highlighted);
    await expect(gold).toHaveCount(highlighted.length, { timeout: 2_000 });
    for (const p of highlighted) {
      const card = gold.filter({ hasText: p.name });
      // Gold card: the accent fill, with a navy button instead of a white one.
      await expect(card).toHaveCSS("background-color", "rgb(200, 162, 78)", { timeout: 2_000 });
      await expect(card.getByRole("link", { name: /View plan/ })).toHaveClass(/btn-navy/, {
        timeout: 2_000,
      });
    }
  }).toPass({ timeout: 45_000 });
  // Summary cards only (Unit 17c): "Invest from", no rates or package rows.
  const cards = planCards(page);
  await expect(cards.first().getByText("Invest from")).toBeVisible();
  await expect(cards.first()).not.toContainText(/%/);
});

test("“View plan” opens the plan page; unknown slugs are 404", async ({ page }) => {
  await page.goto("/invest");
  const first = planCards(page).first();
  const name = (await first.locator("h3").textContent())?.trim() ?? "";
  const plan = (await getPlanRows()).find((p) => p.name === name);
  expect(plan?.slug, `plan "${name}" has a web address`).toBeTruthy();
  await first.getByRole("link", { name: /View plan/ }).click();
  await expect(page).toHaveURL(new RegExp(`/invest/${plan!.slug}$`));
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByText(/Investment returns are subject to the terms/).first()).toBeVisible();

  const res = await page.goto("/invest/no-such-plan-e2e");
  expect(res?.status()).toBe(404);
});

test("the seeded 12-month plan: 3 packages with gain and % per year; stacked on phones", async ({
  page,
}) => {
  const res = await page.goto("/invest/sample-12-month-plan");
  test.skip(res?.status() === 404, "12-month sample plan not seeded in this database");
  const rows = page
    .getByRole("table", { name: "Investment packages" })
    .locator("[data-package-amount]");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0).locator('[data-cell="gain"]')).toContainText("₦500,000");
  await expect(rows.nth(0).locator('[data-cell="per-year"]')).toContainText("5.0%");
  await expect(rows.nth(2).locator('[data-cell="gain"]')).toContainText("₦2,500,000");
  await expect(rows.nth(2).locator('[data-cell="per-year"]')).toContainText("8.3%");
  await expect(page.getByTestId("plan-contract")).toContainText("Your agreement is with");
  await expect(page.locator("main")).not.toContainText(/guarantee/i);
  // No FAQPage or financial JSON-LD on plan pages.
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join(" ")).not.toMatch(/FAQPage|FinancialProduct|InvestmentOrDeposit/);
  if (page.viewportSize()!.width < 800) {
    const box = await rows.first().boundingBox();
    expect(box!.width).toBeGreaterThan(page.viewportSize()!.width * 0.8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
});

test("FAQ items open and close with the mouse and the keyboard", async ({ page }) => {
  await page.goto("/invest");
  const faq = page.getByRole("region", { name: /Before you invest/ });
  const items = faq.locator("details");
  const count = await items.count();
  expect(count).toBeGreaterThan(0);

  const first = items.first();
  const firstSummary = first.locator("summary");
  await expect(first).not.toHaveAttribute("open", "");
  await firstSummary.click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p").first()).toBeVisible();
  await firstSummary.click();
  await expect(first).not.toHaveAttribute("open", "");

  const second = items.nth(1);
  await second.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(second).not.toHaveAttribute("open", "");
});

test("submitting with a plan and amount saves source INVEST_PAGE, planId and amountKobo", async ({
  page,
}) => {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${n()}` });
  await page.goto("/invest#start");
  const form = page.getByRole("form", { name: "Investment enquiry" });
  const name = `[E2E] ${randomUUID().slice(0, 8)}`;
  created.push(name);
  const plan = (await getPlanRows()).find((p) => p.status === "PUBLISHED")!;

  await form.getByLabel("Full name").fill(name);
  await form.getByLabel("Phone / WhatsApp").fill("08030000000");
  await form.getByLabel("Plan").selectOption(plan.id);
  await form.getByLabel("Amount (₦)").fill("₦2,500,000");
  await page.waitForTimeout(3_100); // minimum fill time (anti-bot)
  await form.getByRole("button", { name: "Request a call back" }).click();
  await expect(form.getByRole("status")).toContainText(/thank you/i, { timeout: 20_000 });

  const row = await findInvestEnquiry(name);
  expect(row).toEqual({ source: "INVEST_PAGE", planId: plan.id, amountKobo: "250000000" });
});

test("the disclaimer is visible and nothing on the page says 'guarantee'", async ({ page }) => {
  await page.goto("/invest");
  await expect(
    page.getByText("Investment returns are subject to the terms", { exact: false }),
  ).toBeVisible();
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/guarantee/i);
  expect(await page.content()).not.toMatch(/guarantee/i);
});
