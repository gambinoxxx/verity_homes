// Unit 20 — SEO: unique titles/descriptions, canonical URLs, Open Graph image, Organization
// JSON-LD, robots.txt, sitemap.xml and 308s from SlugRedirect. Uses the seeded [SAMPLE] data.
import { test, expect, type Page } from "@playwright/test";
import { addE2eRedirect, removeE2eSeoRedirects } from "./helpers/db";

const PROPERTY = "sample-contemporary-detached-duplex";
const POST = "sample-property-documents-explained";
const PLAN = "sample-12-month-plan";

const ROUTES = [
  "/",
  "/properties",
  `/properties/${PROPERTY}`,
  "/invest",
  `/invest/${PLAN}`,
  "/about",
  "/blog",
  `/blog/${POST}`,
  "/contact",
  "/privacy",
];

async function head(page: Page) {
  return page.evaluate(() => {
    // Whole document: request-time metadata (e.g. /properties, which reads the URL filters) is
    // streamed into <body> for browsers (Next 16); bots that can't run JS get it in <head>.
    const meta = (sel: string) => document.querySelector(sel)?.getAttribute("content") ?? "";
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
      ogUrl: meta('meta[property="og:url"]'),
      ogImage: meta('meta[property="og:image"]'),
      ogTitle: meta('meta[property="og:title"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (s) => JSON.parse(s.textContent ?? "{}") as Record<string, unknown>,
      ),
    };
  });
}

test("every public page: unique title + description, canonical, og:image, Organization JSON-LD", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "head tags are the same on every viewport");
  test.setTimeout(120_000);
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const route of ROUTES) {
    const res = await page.goto(route);
    expect(res?.status(), route).toBe(200);
    const h = await head(page);
    expect(h.title, `${route} title`).toMatch(/\S/);
    expect(h.description.length, `${route} description`).toBeGreaterThan(40);
    expect(titles.get(h.title), `${route} repeats the title of`).toBeUndefined();
    expect(descriptions.get(h.description), `${route} repeats the description of`).toBeUndefined();
    titles.set(h.title, route);
    descriptions.set(h.description, route);
    // Canonical and og:url are absolute (metadataBase) and point at this page.
    const canonical = new URL(h.canonical);
    expect(canonical.pathname, `${route} canonical`).toBe(route);
    expect(new URL(h.ogUrl).pathname, `${route} og:url`).toBe(route);
    expect(h.ogImage, `${route} og:image`).toMatch(/^https?:\/\//);
    expect(h.ogTitle).toBe(h.title);
    expect(h.twitterCard).toBe("summary_large_image");
    const orgs = h.ld.filter((l) => l["@type"] === "Organization");
    expect(orgs, `${route} Organization JSON-LD`).toHaveLength(1);
    expect(orgs[0]).toMatchObject({ identifier: { value: expect.stringMatching(/^\d+$/) } });
    expect(JSON.stringify(orgs[0])).not.toMatch(/streetAddress/);
  }
});

test("/properties: filters and sort canonicalise to /properties; page 2 is self-canonical", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "head tags are the same on every viewport");
  for (const q of ["?type=rent", "?sort=price-asc", "?area=lekki&page=2"]) {
    await page.goto(`/properties${q}`);
    const c = new URL((await head(page)).canonical);
    expect(`${c.pathname}${c.search}`, q).toBe("/properties");
  }
  await page.goto("/properties?page=2");
  const p2 = await head(page);
  const c = new URL(p2.canonical);
  expect(`${c.pathname}${c.search}`).toBe("/properties?page=2");
  expect(p2.title).toMatch(/page 2/);
});

test("property JSON-LD is a RealEstateListing with an offer; plan pages have no financial data", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "head tags are the same on every viewport");
  await page.goto(`/properties/${PROPERTY}`);
  const listing = (await head(page)).ld.find((l) => l["@type"] === "RealEstateListing");
  expect(listing).toMatchObject({ offers: { "@type": "Offer", availability: expect.any(String) } });
  expect(JSON.stringify(listing)).not.toMatch(/streetAddress/);
  // Legal review pending (open question 54): plan pages carry normal metadata only.
  await page.goto(`/invest/${PLAN}`);
  const types = (await head(page)).ld.map((l) => l["@type"]);
  expect(types).toEqual(["Organization"]);
});

test("not-found pages are noindex", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "head tags are the same on every viewport");
  const res = await page.goto("/no-such-page-e2e");
  expect(res?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
});

test("pages without a cover use the brand image; covers are used when present", async ({
  page,
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "head tags are the same on every viewport");
  await page.goto("/about");
  const about = await head(page);
  expect(about.ogImage).toMatch(/\/og\/verity-homes-1200x630\.png$/);
  const img = await request.get(new URL(about.ogImage).pathname);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");
  await page.goto(`/blog/${POST}`);
  expect((await head(page)).ogImage).not.toMatch(/verity-homes-1200x630/);
});

test("social bots get /properties metadata in the server HTML <head>", async ({
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "no browser needed");
  const res = await request.get("/properties?type=rent", {
    headers: { "user-agent": "facebookexternalhit/1.1" },
  });
  const html = await res.text();
  const headHtml = html.slice(0, html.indexOf("</head>"));
  expect(headHtml).toMatch(
    /<title>Properties for rent in Lagos — Verity Homes and Properties<\/title>/,
  );
  expect(headHtml).toMatch(/<meta name="description" content="[^"]{40,}"/);
  expect(headHtml).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/properties"/);
});

// Outside Vercel production (this server: no VERCEL_ENV) robots.txt blocks everything; the
// production rules are unit-tested (tests/unit/seo.test.ts).
test("robots.txt outside production disallows everything", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "no browser needed");
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-Agent: \*/i);
  expect(body).toMatch(/^Disallow: \/$/m);
  expect(body).not.toMatch(/^Allow:/m);
});

test("sitemap.xml: static pages + published properties, posts and plans; no drafts", async ({
  request,
}, info) => {
  test.skip(info.project.name !== "desktop", "no browser needed");
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  for (const p of ["/", "/properties", "/invest", "/about", "/blog", "/contact", "/privacy"])
    expect(locs, p).toContain(p);
  expect(locs).toContain(`/properties/${PROPERTY}`);
  expect(locs).toContain(`/blog/${POST}`);
  expect(locs).toContain(`/invest/${PLAN}`);
  expect(locs).not.toContain("/blog/e2e-draft-post");
  expect(locs.some((p) => p.startsWith("/admin"))).toBe(false);
  // Detail pages carry lastModified.
  expect(xml).toMatch(new RegExp(`<loc>[^<]*/blog/${POST}</loc>\\s*<lastmod>\\d{4}-\\d{2}-\\d{2}`));
});

test.describe("308 from SlugRedirect", () => {
  test.afterAll(async () => removeE2eSeoRedirects());

  test("old property, post and plan slugs 308 to the current page", async ({ request }, info) => {
    test.skip(info.project.name !== "desktop", "no browser needed");
    await addE2eRedirect("PROPERTY", "e2e-seo-old-property", PROPERTY);
    await addE2eRedirect("POST", "e2e-seo-old-post", POST);
    await addE2eRedirect("PLAN", "e2e-seo-old-plan", PLAN);
    for (const [from, to] of [
      ["/properties/e2e-seo-old-property", `/properties/${PROPERTY}`],
      ["/blog/e2e-seo-old-post", `/blog/${POST}`],
      ["/invest/e2e-seo-old-plan", `/invest/${PLAN}`],
    ] as const) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(new URL(res.headers().location!, "http://x").pathname, from).toBe(to);
    }
  });
});
