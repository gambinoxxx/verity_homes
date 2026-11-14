import { randomUUID } from "node:crypto";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { readingMinutes } from "../../lib/post-content";
import { blobExists } from "./helpers/blob";
import {
  categoryByName,
  cleanUpE2eCategories,
  cleanUpE2ePosts,
  findPostById,
  findPostByTitle,
  insertE2ePost,
} from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";

// Unit 18: admin blog posts + categories, against the TEST database. Rows are "[SAMPLE] E2E …"
// (unique per run and project) and removed afterwards; uploads go under e2e/posts/<id>/ in Blob
// and are checked/removed by the flow itself (the global teardown sweeps anything left).

const SAMPLES = path.resolve("public/samples");
const posts: string[] = [];
const categories: string[] = [];

test.afterAll(async () => {
  await cleanUpE2ePosts(posts);
  await cleanUpE2eCategories(categories);
});

/** The visible editor (Next keeps a hidden copy of the previous page mounted). */
const editor = (page: Page) => page.getByRole("form", { name: "Post editor" });
/** An editor control by field path; ids are scoped per editor instance ("…f-title"). */
const byId = (page: Page, id: string) => editor(page).locator(`[id$="f-${id}"]`);

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });
}

const words = (n: number, w = "property") =>
  Array.from({ length: n }, (_, i) => `${w}${i % 7 === 0 ? "." : ""}`).join(" ");

test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("draft with cover + inline image → publish → /blog + home → rename 308 → remove image → unpublish → delete", async ({
    page,
    request,
    isMobile,
  }) => {
    // One run is enough: a published E2E post briefly shows on /blog and the home page, so
    // desktop and mobile don't both publish at once.
    test.skip(isMobile, "the full publish flow runs on desktop");
    test.setTimeout(240_000);
    const token = randomUUID().slice(0, 8);
    const title = `[SAMPLE] E2E Post ${token}`;
    const renamed = `[SAMPLE] E2E Renamed ${token}`;
    const catName = `[SAMPLE] E2E Cat ${token}`;
    posts.push(title, renamed);
    categories.push(catName);
    const body = [
      "## What to check",
      "",
      words(430),
      "",
      "Read [our listings](/properties) or [an external guide](https://example.com/guide).",
      "",
      "<script>window.__e2eXss = 1</script>",
      "",
      "- First point",
      "- Second point",
      "",
      "> A pull quote.",
    ].join("\n");

    // ---- New draft: title → slug, inline new category, excerpt + counter, body ----
    await page.goto("/admin/posts/new");
    await expect(page.getByRole("heading", { level: 1, name: "Write a post" })).toBeVisible();
    await byId(page, "title").fill(title);
    await expect(byId(page, "slug")).toHaveValue(`sample-e2e-post-${token}`);
    await expect(byId(page, "authorName")).toHaveValue("Esther Ezenagu");
    await editor(page).getByRole("button", { name: "+ New category" }).click();
    await byId(page, "newCategory").fill(catName);
    await byId(page, "newCategory").press("Enter"); // adds the category, never submits the post
    await expectToast(page, /Added/);
    await expect(byId(page, "categoryId").locator("option:checked")).toHaveText(catName);
    await byId(page, "excerpt").fill("x".repeat(170));
    await expect(editor(page).getByTestId("excerpt-counter")).toContainText(
      "170 / 160 recommended — Google may cut it short",
    );
    await byId(page, "excerpt").fill(`E2E excerpt ${token}`);
    await byId(page, "content").fill(body);
    await expect(editor(page).getByTestId("reading-time")).toContainText(
      `${readingMinutes(body)} min read`,
    );
    await expect(editor(page).getByTestId("cover-save-first")).toBeVisible();
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expectToast(page, /Draft saved/);
    await expect(page).toHaveURL(/\/admin\/posts\/(?!new$)[a-z0-9]+$/);
    const created = await findPostByTitle(title);
    expect(created).toMatchObject({ status: "DRAFT", publishedAt: null });
    const id = created!.id;
    const slug = created!.slug;
    expect(slug).toBe(`sample-e2e-post-${token}`);

    // ---- Cover: upload (resized, Blob e2e/posts/<id>/), alt text ----
    await editor(page)
      .getByTestId("cover-file-input")
      .setInputFiles(path.join(SAMPLES, "villa.jpg"));
    await expect(editor(page).getByRole("button", { name: "Replace cover" })).toBeVisible({
      timeout: 60_000,
    });
    await byId(page, "coverAlt").fill(`E2E cover ${token}`);

    // ---- Insert image: upload → alt text dialog → ![alt](url) in the body ----
    await editor(page)
      .getByTestId("inline-file-input")
      .setInputFiles(path.join(SAMPLES, "dusk.jpg"));
    const altDialog = page.getByRole("dialog", { name: "Describe this image" });
    await expect(altDialog).toBeVisible({ timeout: 60_000 });
    await altDialog.getByRole("button", { name: "Insert image" }).click();
    await expect(altDialog.getByText(/Describe the image/)).toBeVisible(); // alt is required
    await altDialog.getByLabel("Alt text").fill(`E2E inline ${token}`);
    await altDialog.getByRole("button", { name: "Insert image" }).click();
    await expect(altDialog).toBeHidden();
    const withImage = await byId(page, "content").inputValue();
    const inlineMatch = withImage.match(
      new RegExp(`!\\[E2E inline ${token}\\]\\((https://[^)]+/e2e/posts/${id}/inline/[^)]+)\\)`),
    );
    expect(inlineMatch, "inline image Markdown inserted").not.toBeNull();
    const inlineUrl = inlineMatch![1]!;

    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expectToast(page, /Changes saved/);
    const saved = await findPostById(id);
    expect(saved?.coverUrl).toMatch(
      new RegExp(`\\.public\\.blob\\.vercel-storage\\.com/e2e/posts/${id}/`),
    );
    expect(saved?.coverAlt).toBe(`E2E cover ${token}`);
    expect(saved?.readingMinutes).toBe(readingMinutes(withImage));
    const coverUrl = saved!.coverUrl!;
    expect(await blobExists(coverUrl)).toBe(true);
    expect(await blobExists(inlineUrl)).toBe(true);

    // Drafts aren't public.
    expect((await request.get(`/blog/${slug}`)).status()).toBe(404);

    // ---- Publish → /blog and the home page show it with the cover ----
    await editor(page).getByRole("button", { name: "Publish", exact: true }).click();
    await expectToast(page, /Published/);
    expect((await findPostById(id))?.publishedAt).not.toBeNull();
    expect((await request.get(`/blog/${slug}`)).status()).toBe(200);

    const pub = await page.context().newPage();
    const coverImg = (p: Page) =>
      p.locator(`img[alt="E2E cover ${token}"][src*="e2e%2Fposts%2F${id}"]`);
    await pub.goto("/blog");
    await expect(pub.locator(`[data-post-row][href="/blog/${slug}"]`)).toBeVisible();
    await expect(coverImg(pub).first()).toBeAttached();
    await pub.goto("/");
    await expect(pub.locator(`#blog a[href="/blog/${slug}"]`)).toBeAttached();
    await expect(coverImg(pub).first()).toBeAttached();

    // ---- Post page: inline image, reading time, no script ----
    const res = await pub.goto(`/blog/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(pub.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(pub.getByRole("navigation", { name: "Breadcrumb" })).toContainText(
      `${readingMinutes(withImage)} min read`,
    );
    const inlineImg = pub.locator(`article .prose img[alt="E2E inline ${token}"]`);
    await expect(inlineImg).toBeVisible();
    expect(await inlineImg.getAttribute("src")).toContain(`e2e%2Fposts%2F${id}%2Finline`);
    const publicHtml = await pub.locator("article .prose").innerHTML();
    expect(publicHtml).not.toContain("<script");
    expect(publicHtml).not.toContain("__e2eXss");
    expect(await pub.evaluate(() => (window as { __e2eXss?: unknown }).__e2eXss)).toBeUndefined();

    // ---- Preview tab = the public renderer's HTML, <script> stripped ----
    await editor(page).getByRole("tab", { name: "Preview" }).click();
    const preview = editor(page).getByTestId("post-preview").locator(".prose");
    await expect(preview.locator(`img[alt="E2E inline ${token}"]`)).toBeVisible();
    // Same renderer → same HTML. Only two serialisation artifacts differ and are removed: React's
    // server-render text separators (<!-- -->) and next/image's placeholder style (present until
    // the image loads, and re-serialised by the browser). Tags, attributes, srcset and text must match.
    const normalise = (html: string) =>
      html.replace(/<!--.*?-->/g, "").replace(/ style="color: ?transparent;?"/g, "");
    expect(normalise(await preview.innerHTML())).toBe(normalise(publicHtml));
    expect(await preview.innerHTML()).not.toContain("<script");
    expect(await page.evaluate(() => (window as { __e2eXss?: unknown }).__e2eXss)).toBeUndefined();
    await editor(page).getByRole("tab", { name: "Write" }).click();

    // ---- Rename title + slug → the old URL 308s to the new one ----
    const newSlug = `sample-e2e-renamed-${token}`;
    await byId(page, "title").fill(renamed);
    await byId(page, "slug").fill(newSlug);
    await editor(page).getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /Changes saved/);
    const old = await request.get(`/blog/${slug}`, { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toMatch(new RegExp(`/blog/${newSlug}$`));
    expect((await request.get(`/blog/${newSlug}`)).status()).toBe(200);

    // ---- Remove the inline image from the body → save → its Blob file is gone ----
    const without = (await byId(page, "content").inputValue()).replace(inlineMatch![0], "");
    await byId(page, "content").fill(without);
    await editor(page).getByRole("button", { name: "Save changes" }).click();
    await expectToast(page, /Changes saved/);
    await expect.poll(() => blobExists(inlineUrl), { timeout: 20_000 }).toBe(false);
    expect(await blobExists(coverUrl)).toBe(true); // the cover is still used
    await pub.goto(`/blog/${newSlug}`);
    await expect(pub.locator(`article .prose img[alt="E2E inline ${token}"]`)).toHaveCount(0);
    await pub.close();

    // ---- Unpublish → 404 ----
    await editor(page).getByRole("button", { name: "Unpublish" }).click();
    await expectToast(page, /Unpublished/);
    expect((await request.get(`/blog/${newSlug}`)).status()).toBe(404);
    // The editor remounts with the new status (its key); act on the refreshed one.
    await expect(editor(page).getByText("Draft — not on the website")).toBeVisible();

    // ---- Delete (the dialog names it) → row and cover file gone ----
    await editor(page).getByRole("button", { name: "Delete post" }).click();
    const dialog = page.getByRole("dialog", { name: `Delete “${renamed}”?` });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete post" }).click();
    await expectToast(page, /Deleted/);
    await expect(page).toHaveURL(/\/admin\/posts$/);
    expect(await findPostById(id)).toBeNull();
    await expect.poll(() => blobExists(coverUrl), { timeout: 20_000 }).toBe(false);
    // Old links no longer redirect anywhere.
    expect((await request.get(`/blog/${slug}`, { maxRedirects: 0 })).status()).toBe(404);
  });

  test("categories: add → use → delete blocked → move the post → rename → delete", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const token = randomUUID().slice(0, 8);
    const catName = `[SAMPLE] E2E Topic ${token}`;
    const renamedCat = `[SAMPLE] E2E Topic renamed ${token}`;
    const title = `[SAMPLE] E2E Cat post ${token}`;
    categories.push(catName, renamedCat);
    posts.push(title);
    const postId = await insertE2ePost(title, `sample-e2e-cat-post-${token}`);
    const row = () => page.locator("tr").filter({ hasText: catName });

    // ---- Add ----
    await page.goto("/admin/categories");
    await expect(page.getByRole("heading", { level: 1, name: "Categories" })).toBeVisible();
    await page.getByLabel("Category name").fill(catName);
    await page.getByRole("button", { name: "Add category" }).click();
    await expectToast(page, /Added/);
    await expect(row()).toBeVisible();
    const cat = await categoryByName(catName);
    expect(cat?.slug).toBe(`sample-e2e-topic-${token}`);
    // A duplicate name (any case) is refused.
    await page.getByLabel("Category name").fill(catName.toUpperCase());
    await page.getByRole("button", { name: "Add category" }).click();
    await expect(page.getByText("There's already a category with this name.")).toBeVisible();

    // ---- Use it on a post ----
    await page.goto(`/admin/posts/${postId}`);
    await byId(page, "categoryId").selectOption({ label: catName });
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expectToast(page, /Changes saved/);
    expect((await findPostById(postId))?.categoryId).toBe(cat!.id);

    // ---- Delete is blocked while the post uses it ----
    await page.goto("/admin/categories");
    await expect(row().getByTestId("delete-blocked")).toHaveText("Move 1 post first");
    await expect(row().getByRole("button", { name: /^Delete .* first\)$/ })).toBeDisabled();
    await expect(row().getByRole("link", { name: "1 post" })).toHaveAttribute(
      "href",
      `/admin/posts?category=${cat!.slug}`,
    );

    // ---- Move the post to another category ----
    await page.goto(`/admin/posts/${postId}`);
    await byId(page, "categoryId").selectOption({ label: "Investing" });
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expectToast(page, /Changes saved/);

    // ---- Rename (slug follows), then delete ----
    await page.goto("/admin/categories");
    await row()
      .getByRole("button", { name: `Rename ${catName}` })
      .click();
    await page.getByLabel(`New name for ${catName}`).fill(renamedCat);
    await page.getByLabel(`New name for ${catName}`).press("Enter");
    await expectToast(page, /Renamed/);
    expect((await categoryByName(renamedCat))?.slug).toBe(`sample-e2e-topic-renamed-${token}`);
    const renamedRow = page.locator("tr").filter({ hasText: renamedCat });
    await renamedRow.getByRole("button", { name: `Delete ${renamedCat}` }).click();
    const dialog = page.getByRole("dialog", { name: `Delete “${renamedCat}”?` });
    await dialog.getByRole("button", { name: "Delete category" }).click();
    await expectToast(page, /Deleted/);
    await expect(renamedRow).toHaveCount(0);
    expect(await categoryByName(renamedCat)).toBeNull();
  });

  test("list: tabs, search and category filter live in the URL", async ({ page }) => {
    const token = randomUUID().slice(0, 8);
    const title = `[SAMPLE] E2E Listed ${token}`;
    posts.push(title);
    await insertE2ePost(title, `sample-e2e-listed-${token}`);

    await page.goto("/admin/posts");
    await expect(page.getByRole("heading", { level: 1, name: "Blog posts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Write a post/ }).first()).toHaveAttribute(
      "href",
      "/admin/posts/new",
    );
    const search = page.getByRole("searchbox", { name: "Search posts" });
    await search.fill(token);
    await search.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/admin/posts\\?q=${token}$`));
    const rows = page.getByRole("region", { name: "Blog posts" }).locator("tbody tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(title);
    await expect(rows.first()).toContainText("Draft");
    // Drafts have no "View on site" action.
    await expect(rows.first().getByRole("link", { name: /on site/ })).toHaveCount(0);

    await page
      .getByRole("navigation", { name: "Status" })
      .getByRole("link", { name: /^Published/ })
      .click();
    await expect(page).toHaveURL(/status=published/);
    await expect(page.getByText("No posts match")).toBeVisible();

    await page.goto("/admin/posts");
    await page.getByLabel("Category").selectOption({ label: "Renting" });
    await expect(page).toHaveURL(/\/admin\/posts\?category=renting$/);
    await expect(rows.first()).toContainText("Renting");
    const published = rows.filter({ hasText: "Published" }).first();
    await expect(published.getByRole("link", { name: /on site/ })).toHaveAttribute(
      "href",
      /^\/blog\//,
    );
  });

  test("validation: publishing a new post lists what's missing and focuses the first", async ({
    page,
  }) => {
    await page.goto("/admin/posts/new");
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expect(byId(page, "title-err")).toHaveText("Add a title");
    await expect(byId(page, "title")).toBeFocused();

    await byId(page, "title").fill("[SAMPLE] E2E never saved");
    await byId(page, "content").fill("[bad](javascript:alert(1))");
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expect(byId(page, "content-err")).toContainText("javascript:");

    await byId(page, "content").fill("Too short.");
    await editor(page).getByRole("button", { name: "Publish", exact: true }).click();
    const summary = page.getByRole("alert").filter({ hasText: "things to fix" });
    await expect(summary).toBeVisible();
    for (const label of ["Category", "Excerpt", "Cover image", "Article"]) {
      await expect(summary.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(byId(page, "categoryId")).toBeFocused();
    expect(await findPostByTitle("[SAMPLE] E2E never saved")).toBeNull();
  });
});

test.describe("signed-in non-admin", () => {
  test.use({ storageState: storageStateFor("viewer") });

  test("gets 403 on a post's editor", async ({ page }) => {
    const token = randomUUID().slice(0, 8);
    const title = `[SAMPLE] E2E Viewer ${token}`;
    posts.push(title);
    const id = await insertE2ePost(title, `sample-e2e-viewer-${token}`);
    const res = await page.goto(`/admin/posts/${id}`);
    expect(res?.status()).toBe(403);
    await expect(page.getByRole("heading", { level: 1, name: "No admin access" })).toBeVisible();
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
