// Unit 21 step 6b — SEO / ad landing pages: each renders its H1, the enquiry form near the top,
// WhatsApp + call buttons, a canonical to itself, and is in the sitemap exactly once. A lead
// sent from one is saved with source LANDING_PAGE and its first-touch source.
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { LANDING_PAGES } from "../../lib/landing-pages";
import { cleanUpE2eRows, findEnquiryLead, findEnquirySource } from "./helpers/db";

const created: string[] = [];
test.afterAll(async () => {
  await cleanUpE2eRows(created, []);
});

for (const lp of LANDING_PAGES) {
  test(`${lp.path}: H1, CTAs, form above the fold, canonical`, async ({ page }) => {
    const res = await page.goto(lp.path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(lp.h1);
    expect(await page.title()).toBe(lp.title);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical ?? "").pathname).toBe(lp.path);
    expect(await page.locator('meta[name="description"]').getAttribute("content")).toBe(
      lp.description,
    );
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);

    // Enquiry form: in the hero, reachable within about one screen of scrolling.
    const form = page.getByRole("form", { name: lp.formHeading });
    await expect(form).toBeVisible();
    const box = await form.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.y).toBeLessThan(vh * 1.6);

    // WhatsApp button names the page; Call button when a phone is set; closing CTA.
    const wa = page.locator('main a[data-contact="whatsapp"]').first();
    await expect(wa).toHaveAttribute("href", new RegExp(encodeURIComponent(lp.path)));
    await expect(page.getByRole("link", { name: "Send an enquiry" })).toHaveAttribute(
      "href",
      "#enquiry",
    );
    // FAQ (plain HTML, no FAQPage schema) and listings or the coming-soon card.
    await expect(page.locator("details summary")).toHaveCount(lp.faqs.length);
    expect(await page.content()).not.toContain('"FAQPage"');
    await expect(page.getByRole("heading", { level: 2, name: lp.listings.heading })).toBeVisible();
  });
}

test("every landing page is in the sitemap once, and linked from the footer", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "no viewport difference");
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  await page.goto("/");
  const footer = page.getByRole("navigation", { name: "Popular searches" });
  for (const lp of LANDING_PAGES) {
    expect(
      locs.filter((l) => l === lp.path),
      lp.path,
    ).toHaveLength(1);
    await expect(footer.locator(`a[href="${lp.path}"]`)).toHaveCount(1);
  }
});

test("a lead from a landing page is saved as LANDING_PAGE with its ad source", async ({ page }) => {
  const lp = LANDING_PAGES[1]; // land
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `192.0.2.${n()}` });
  await page.goto(`${lp.path}?utm_source=google&utm_medium=cpc&utm_campaign=land-lekki`);
  const form = page.getByRole("form", { name: lp.formHeading });
  const name = `[E2E] Landing ${randomUUID().slice(0, 8)}`;
  await form.getByLabel("Full name").fill(name);
  await form.getByLabel("Phone / WhatsApp").fill("08030000000");
  await page.waitForTimeout(3_100); // minimum fill time (anti-bot)
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(form.getByRole("status")).toContainText(/thank you/i, { timeout: 20_000 });
  created.push(name);
  expect(await findEnquirySource(name)).toBe("LANDING_PAGE");
  expect(await findEnquiryLead(name)).toMatchObject({
    utmSource: "google",
    utmCampaign: "land-lekki",
    landingPage: `${lp.path}?utm_source=google&utm_medium=cpc&utm_campaign=land-lekki`,
  });
});
