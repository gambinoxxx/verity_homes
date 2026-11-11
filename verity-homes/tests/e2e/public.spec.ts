// Runs on every public route at desktop (1440) and mobile (390) via the two Playwright projects.
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Add new public routes here as they are built. `slug` routes use seeded [SAMPLE] data.
const ROUTES = [
  "/",
  "/properties",
  "/properties/sample-contemporary-detached-duplex",
  "/invest",
  "/about",
  "/blog",
  "/contact",
  "/this-page-does-not-exist",
];

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    // third-party map iframes may log their own noise; ignore those only
    if (m.type() === "error" && !/google|maps|gstatic/i.test(m.text()))
      errors.push(`console: ${m.text()}`);
  });
  return errors;
}

for (const route of ROUTES) {
  test.describe(`public page ${route}`, () => {
    test("loads cleanly, one h1, no console errors", async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(route);
      const expected = route === "/this-page-does-not-exist" ? 404 : 200;
      expect(res?.status(), "HTTP status").toBe(expected);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toHaveCount(1);
      expect(errors, errors.join("\n")).toEqual([]);
    });

    test("no horizontal scroll at 360px", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(route);
      const [sw, cw] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(sw, "page is wider than the screen").toBeLessThanOrEqual(cw);
    });

    test("no serious accessibility violations", async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).exclude("iframe").analyze();
      const bad = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });

    test("every image has an alt attribute", async ({ page }) => {
      await page.goto(route);
      const missing = await page.locator("img:not([alt])").count();
      expect(missing).toBe(0);
    });

    test("screenshot for design comparison", async ({ page }, info) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const name =
        (route === "/" ? "home" : route.replaceAll("/", "_").slice(1)) +
        `-${info.project.name}.png`;
      await page.screenshot({ path: `test-results/screens/${name}`, fullPage: true });
    });
  });
}

test("header links reach every main page", async ({ page }) => {
  await page.goto("/");
  for (const [label, path] of [
    ["Properties", "/properties"],
    ["Invest", "/invest"],
    ["About", "/about"],
    ["Blog", "/blog"],
    ["Contact", "/contact"],
  ] as const) {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    if (!(await nav.isVisible())) await page.getByRole("button", { name: /open menu/i }).click();
    await page.getByRole("link", { name: label, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});
