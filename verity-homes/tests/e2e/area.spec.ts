// Unit 21 step 6 — area pages /properties/in/[area] (seeded [SAMPLE] data on the TEST branch).
import { expect, test } from "@playwright/test";

test("area pages: linked from /properties, H1, listings, CTA, canonical; unknown area 404", async ({
  page,
}) => {
  await page.goto("/properties");
  const nav = page.getByRole("navigation", { name: "Browse by area" });
  const first = nav.getByRole("link").first();
  const href = (await first.getAttribute("href"))!;
  const label = (await first.textContent())!;
  const name = label.replace(/\s*\(\d+\)\s*$/, "").trim();
  const count = Number(/\((\d+)\)/.exec(label)?.[1]);
  expect(href).toMatch(/^\/properties\/in\/[a-z0-9-]+$/);

  const res = await page.goto(href);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    new RegExp(`^Properties for sale and rent in ${name}, `),
  );
  expect(
    new URL((await page.locator('link[rel="canonical"]').getAttribute("href"))!).pathname,
  ).toBe(href);
  await expect(page.locator("main article")).toHaveCount(count);
  await expect(page.getByTestId("help-cta")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Popular searches" }).getByRole("link").first(),
  ).toBeVisible();

  const missing = await page.goto("/properties/in/no-such-area-xyz");
  expect(missing?.status()).toBe(404);
});

test("a property page links to its area; the sitemap lists area pages once", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "no viewport difference");
  await page.goto("/properties");
  const card = page.locator("main article a[href^='/properties/']").first();
  await page.goto((await card.getAttribute("href"))!);
  const more = page.getByRole("link", { name: /^More in / });
  const href = (await more.getAttribute("href"))!;
  expect(href).toMatch(/^\/properties\/in\//);
  expect((await page.request.get(href)).status()).toBe(200);

  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(locs.filter((l) => l === href)).toHaveLength(1);
});
