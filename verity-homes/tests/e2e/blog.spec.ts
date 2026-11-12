// Blog list + post pages (Unit 11). Data comes from the TEST branch: the seed's 3 [SAMPLE] posts
// plus scripts/e2e-test-settings.ts (end of `npm run db:test:reset`): 5 older [E2E] posts
// (second page), "e2e-raw-html" (raw <script>/<div>/<img onerror> in the Markdown), a draft
// "e2e-draft-post", and the redirect e2e-old-post-slug → sample-tenant-checklist-lagos.
// Posts are cached and prerendered, so the fixtures must exist before the e2e server builds.
//
// After a client-side navigation Next 16 keeps the previous page mounted but hidden
// (<Activity>), so elements are found by role or scoped to visible content.
import { test, expect, type Page } from "@playwright/test";
import { countPublishedPosts } from "./helpers/db";

const POST = "sample-property-documents-explained";
const POST_TITLE = "[SAMPLE] C of O, Governor's Consent, Deed: what each property document means";

const rows = (page: Page) => page.locator("[data-post-row]:visible");

test.describe("blog list", () => {
  test("category pill updates the URL and shows only that category", async ({ page }) => {
    await page.goto("/blog");
    const pills = page.getByRole("navigation", { name: "Categories" });
    await expect(pills.getByRole("link", { name: "All posts" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await pills.getByRole("link", { name: "Renting" }).click();
    await expect(page).toHaveURL(/\/blog\?category=renting$/);
    await expect(pills.getByRole("link", { name: "Renting" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Renting");
    await expect(rows(page).first()).toContainText("tenant's checklist");
  });

  test("an unknown or malformed category never crashes", async ({ page }) => {
    for (const q of ["?category=nope", "?category=%3Cscript%3E", "?page=abc&q="]) {
      const res = await page.goto(`/blog${q}`);
      expect(res?.status(), q).toBe(200);
    }
    await page.goto("/blog?category=nope");
    await expect(page.getByRole("heading", { name: "No articles found" })).toBeVisible();
  });

  test("search finds a seeded post (title or excerpt, any case)", async ({ page }) => {
    await page.goto("/blog");
    const search = page.getByRole("searchbox", { name: "Search articles" });
    await search.fill("TENANT'S CHECKLIST");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/blog\?q=TENANT%27S\+CHECKLIST$/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("A tenant's checklist");
    await expect(search).toHaveValue("TENANT'S CHECKLIST");
  });

  test("search with nonsense shows the empty state and a way back", async ({ page }) => {
    await page.goto("/blog?q=zzqx-no-such-article");
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "No articles found" })).toBeVisible();
    await page.getByRole("link", { name: "See all articles" }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(rows(page).first()).toBeVisible();
  });

  test("pagination: 6 per page, page 2 shows the rest", async ({ page }) => {
    const total = await countPublishedPosts();
    test.skip(total <= 6, "Need more than 6 published posts — run npm run db:test:reset.");
    await page.goto("/blog");
    await expect(rows(page)).toHaveCount(6);
    const pager = page.getByRole("navigation", { name: "Pagination" });
    await expect(pager.getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await pager.getByRole("link", { name: "Page 2" }).click();
    await expect(page).toHaveURL(/\/blog\?page=2#posts$/);
    await expect(rows(page)).toHaveCount(Math.min(6, total - 6));
    await expect(
      page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "Page 2" }),
    ).toHaveAttribute("aria-current", "page");
    // A page past the end shows the last page instead of crashing.
    const res = await page.goto("/blog?page=999");
    expect(res?.status()).toBe(200);
    await expect(rows(page).first()).toBeVisible();
  });

  test("sidebar: recent posts, categories with counts, invest CTA", async ({ page }) => {
    await page.goto("/blog");
    const side = page.getByRole("complementary", { name: "Blog sidebar" });
    await expect(side.getByRole("heading", { name: "Recent posts" })).toBeVisible();
    await expect(side.getByRole("link", { name: /Renting\s+1 article$/ })).toHaveAttribute(
      "href",
      "/blog?category=renting",
    );
    await expect(side.getByRole("link", { name: "Explore plans" })).toHaveAttribute(
      "href",
      "/invest",
    );
  });

  test("header, footer and home 'All articles' links open /blog", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "All articles" }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Our blog");

    await page.goto("/contact");
    await page.locator("footer").getByRole("link", { name: "Blog", exact: true }).click();
    await expect(page).toHaveURL(/\/blog$/);

    if (!isMobile) {
      await page.goto("/contact");
      await page
        .getByRole("navigation", { name: "Main" })
        .getByRole("link", { name: "Blog" })
        .click();
      await expect(page).toHaveURL(/\/blog$/);
    }
  });

  test("home latest post cards open their post", async ({ page }) => {
    await page.goto("/");
    const card = page.locator('#blog a[href^="/blog/"]').first();
    const href = await card.getAttribute("href");
    await card.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("blog post", () => {
  test("renders the hero, Markdown body, author and related posts", async ({ page }) => {
    await page.goto(`/blog/${POST}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(POST_TITLE);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("min read");
    const body = page.locator("article .prose");
    await expect(body.getByRole("heading", { level: 2, name: "[SAMPLE] Heading" })).toBeVisible();
    await expect(body.locator("ul > li")).toHaveText(["Point one", "Point two"]);
    await expect(body.locator("blockquote")).toContainText("A pull quote.");
    await expect(page.locator("article")).toContainText("Esther Ezenagu");
    const related = page.locator("#related");
    await expect(related.getByRole("heading", { name: "More articles" })).toBeVisible();
    await expect(related.locator('a[href^="/blog/"]:not([href="/blog"])')).toHaveCount(2);
  });

  test("Article JSON-LD and canonical", async ({ page }) => {
    await page.goto(`/blog/${POST}`);
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}",
    ) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Article");
    expect(ld.headline).toBe(POST_TITLE);
    expect(ld.datePublished).toBeTruthy();
    expect(ld.author).toMatchObject({ name: "Esther Ezenagu" });
    expect(String(ld.image)).toMatch(/\/samples\/dusk\.jpg$/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toMatch(new RegExp(`/blog/${POST}$`));
  });

  test("share links: WhatsApp (title + URL), email, native share", async ({ page }) => {
    await page.goto(`/blog/${POST}`);
    const url = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(url).toBeTruthy();
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent(`${POST_TITLE} ${url}`)}`,
    );
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    await expect(page.getByRole("link", { name: "Share by email" })).toHaveAttribute(
      "href",
      `mailto:?subject=${encodeURIComponent(POST_TITLE)}&body=${encodeURIComponent(url!)}`,
    );
    await expect(page.getByRole("button", { name: "Share on other apps" })).toBeVisible();
  });

  test("native share falls back to copying the link", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/blog/${POST}`);
    await page.evaluate(() => {
      // Desktop browsers without a share sheet: force the fallback path.
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    });
    await page.getByRole("button", { name: "Share on other apps" }).click();
    await expect(page.getByText("Link copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toMatch(new RegExp(`/blog/${POST}$`));
  });

  test("raw HTML in the Markdown is never rendered", async ({ page }) => {
    const res = await page.goto("/blog/e2e-raw-html");
    test.skip(res?.status() === 404, "No e2e-raw-html post — run npm run db:test:reset.");
    const html = (await res?.text()) ?? "";
    expect(html).not.toContain("E2E-XSS-MARKER");
    expect(html).not.toContain("E2E-RAW-DIV");
    expect(html).not.toContain("e2e-raw-img");
    expect(html).not.toMatch(/onerror=/i);
    expect(await page.evaluate(() => (window as { __e2eXss?: unknown }).__e2eXss)).toBeUndefined();
    const body = page.locator("article .prose");
    await expect(body).toContainText("Text before the script.");
    await expect(body.locator("script, .e2e-raw-div, img")).toHaveCount(0);
    // javascript: link has no href; the external one is isolated.
    await expect(body.locator('a[href^="javascript:"]')).toHaveCount(0);
    const ext = body.getByRole("link", { name: "an external link" });
    await expect(ext).toHaveAttribute("target", "_blank");
    await expect(ext).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("draft and unknown slugs return 404", async ({ page }) => {
    for (const slug of ["e2e-draft-post", "no-such-post-anywhere"]) {
      const res = await page.goto(`/blog/${slug}`);
      expect(res?.status(), slug).toBe(404);
    }
  });

  test("an old slug 308-redirects to the current one", async ({ request }) => {
    const res = await request.get("/blog/e2e-old-post-slug", { maxRedirects: 0 });
    test.skip(res.status() === 404, "No SlugRedirect fixture — run npm run db:test:reset.");
    expect(res.status()).toBe(308);
    expect(res.headers().location).toMatch(/\/blog\/sample-tenant-checklist-lagos$/);
  });
});
