// Home page behaviour (Unit 4). Runs on desktop (1440) and mobile (390) with seeded [SAMPLE] data.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("home search bar", () => {
  test("budget ranges follow the tab and are sent as min/max in naira", async ({ page }) => {
    await page.goto("/");
    const budget = page.getByLabel("Budget");
    await expect(budget.locator("option")).toHaveText([
      "Any budget",
      "Under ₦50M",
      "₦50M – ₦150M",
      "₦150M – ₦300M",
      "₦300M – ₦500M",
      "Above ₦500M",
    ]);
    await budget.selectOption({ label: "₦50M – ₦150M" });

    // Switching tab swaps the ranges and clears the choice.
    await page.getByRole("tab", { name: "Rent" }).click();
    await expect(budget).toHaveValue("");
    await expect(budget.locator("option").nth(1)).toHaveText("Under ₦3M");
    await budget.selectOption({ label: "Above ₦20M" });
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/properties\?type=rent&min=20000000$/);
  });

  test("land ranges send both bounds; invest has no budget", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Land" }).click();
    await page.getByLabel("Budget").selectOption({ label: "₦10M – ₦30M" });
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/properties\?type=land&min=10000000&max=30000000$/);

    await page.goto("/");
    await page.getByRole("tab", { name: "Invest" }).click();
    await expect(page.getByLabel("Budget")).toBeDisabled();
  });
});

test("signature projects show the seeded showcase listings with status pills", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: /Developments we're proud of/ });
  await expect(section).toBeVisible();
  // 3 seeded showcase properties → 3 stacked cards.
  await expect(section.locator("img")).toHaveCount(3);
  if (test.info().project.name === "desktop") {
    await expect(section.getByText("Selling now")).toBeVisible();
    // One panel item per project; all but the active one are inert (not focusable while hidden).
    await expect(section.getByRole("link", { name: "Enquire about this" })).toHaveCount(3);
    await expect(section.locator("[inert]")).toHaveCount(2);
  }
});

test("invest section shows plans, the placeholder rate and the disclaimer", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#invest");
  await expect(section.locator("article")).toHaveCount(3);
  await expect(section.getByText("₦1,000,000")).toBeVisible();
  await expect(section.getByText("Rate to be confirmed").first()).toBeAttached();
  await expect(section.getByText(/Investment returns are subject to the terms/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/guarantee/i);
});

test("services accordion opens one item and swaps the caption; /#services lands here", async ({
  page,
}) => {
  await page.goto("/#services");
  const section = page.locator("#services");
  await expect(section).toBeInViewport();
  const land = section.getByRole("button", { name: /Land/ });
  await land.click();
  await expect(land).toHaveAttribute("aria-expanded", "true");
  await expect(section.getByRole("button", { name: /Property sales/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(section.locator("[aria-live]")).toHaveText("Land");
});

test("testimonials and latest posts render from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Clients who trusted Verity" })).toBeVisible();
  const blog = page.locator("#blog");
  await expect(blog.locator('a[href^="/blog/"]')).toHaveCount(3);
});

test("the enquiry form is not live yet: submit disabled, note visible", async ({ page }) => {
  await page.goto("/#contact");
  const form = page.locator("#enquiry");
  await expect(form.getByRole("button", { name: /Send enquiry/ })).toBeDisabled();
  await expect(form.getByText("Form goes live soon", { exact: false })).toBeVisible();
  await expect(form.getByRole("radio", { name: "Investing" })).toBeChecked();
});

test.describe("with motion on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("statement words fill on scroll and are all filled by mid-viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // preloader releases the scroll lock
    const para = page.locator('section[aria-label="Our promise"] p');
    const words = para.locator('[aria-hidden="true"] > span > span');
    expect(await words.count()).toBe(20);
    const filled = () =>
      words.evaluateAll((els) => els.filter((e) => /(^|_)on(\s|$)/.test(e.className)).length);

    // Paragraph top just inside the bottom of the viewport: not started yet.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight * 0.95);
    });
    await expect.poll(filled).toBe(0);

    // Part-way: top at 75% of the viewport.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight * 0.75);
    });
    await expect.poll(filled).toBeGreaterThan(0);
    expect(await filled()).toBeLessThan(20);

    // Owner condition (Open question 21): fully filled once its centre is mid-viewport.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top + r.height / 2 - window.innerHeight / 2);
    });
    await expect.poll(filled).toBe(20);
  });

  test("no serious accessibility violations with animations running", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // preloader
    // The statement's not-yet-filled words are the design's light grey on purpose (the fill
    // effect; Open question 21). They are aria-hidden and the sentence is read once from an
    // sr-only copy, so only those animated words are excluded here. public.spec.ts runs with
    // reduced motion, where every word is filled, and checks the whole page.
    const statement = page.locator('section[aria-label="Our promise"]');
    await expect(statement.locator(".sr-only")).toHaveText(/held to one standard: the truth\./);
    const results = await new AxeBuilder({ page })
      .exclude("iframe")
      .exclude('section[aria-label="Our promise"] p > [aria-hidden="true"]')
      .analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
      [],
    );
  });
});
