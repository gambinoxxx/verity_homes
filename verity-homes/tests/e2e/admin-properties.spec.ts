import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { cleanUpE2eProperties, findPropertyByTitle } from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";

// Unit 14: admin properties list + editor, against the TEST database. Each test creates its own
// "[SAMPLE] E2E …" rows (unique per run and per project) and removes them afterwards.

const created: string[] = [];
test.afterAll(async () => {
  await cleanUpE2eProperties(created);
});

test.use({ storageState: storageStateFor("admin") });

/** The visible editor (Next keeps a hidden copy of the previous page mounted). */
const editor = (page: Page) => page.getByRole("form", { name: "Property editor" });
/** An editor control by field path; ids are scoped per editor instance ("…f-title"). */
const byId = (page: Page, id: string) => editor(page).locator(`[id$="f-${id}"]`);

const field = (page: Page, label: string | RegExp) =>
  page
    .getByRole("form", { name: "Property editor" })
    .getByLabel(label, { exact: typeof label === "string" });

async function expectToast(page: Page, text: RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });
}

test("create → publish → rename (308) → unpublish → delete", async ({ page, request }) => {
  test.setTimeout(180_000);
  const token = randomUUID().slice(0, 8);
  const title = `[SAMPLE] E2E Home ${token}`;
  const renamed = `[SAMPLE] E2E Renamed ${token}`;
  created.push(title, renamed);

  // ---- Create a draft ----
  await page.goto("/admin/properties/new");
  await expect(page.getByRole("heading", { level: 1, name: "Add property" })).toBeVisible();
  await field(page, "Title").fill(title);
  await expect(byId(page, "slug")).toHaveValue(`sample-e2e-home-${token}`);
  await field(page, "Listing type").selectOption("SALE");
  await byId(page, "price").pressSequentially("45000000");
  await expect(byId(page, "price")).toHaveValue("45,000,000");
  await field(page, "Bedrooms").fill("4");
  await field(page, /^Address/).fill("12 Private Close (never public)");
  await field(page, "Area").fill("Yaba");
  await byId(page, "features").fill("Borehole");
  await byId(page, "features").press("Enter");
  await expect(page.getByRole("button", { name: "Remove Borehole" })).toBeVisible();
  await page.getByRole("button", { name: "Add a document" }).click();
  await byId(page, "documents-0-name").fill("Survey plan");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectToast(page, /Draft saved/);
  await expect(page).toHaveURL(/\/admin\/properties\/(?!new$)[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Edit property" })).toBeVisible();

  const row = await findPropertyByTitle(title);
  expect(row).toMatchObject({ status: "DRAFT", publishedAt: null });
  const slug = row!.slug;
  expect(slug).toBe(`sample-e2e-home-${token}`);

  // Drafts aren't public, and "Preview on site" is disabled.
  expect((await request.get(`/properties/${slug}`)).status()).toBe(404);
  await expect(
    editor(page).locator('[aria-disabled="true"]').filter({ hasText: "Preview on site" }),
  ).toBeVisible();
  await expect(editor(page).getByRole("link", { name: /Preview on site/ })).toHaveCount(0);

  // ---- Publish ----
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expectToast(page, /Published/);
  await expect(page.locator("[class*=badge]").filter({ hasText: "Published" })).toBeVisible();
  expect((await findPropertyByTitle(title))?.publishedAt).not.toBeNull();

  const live = await request.get(`/properties/${slug}`);
  expect(live.status()).toBe(200);
  const html = await live.text();
  expect(html).toContain(title.replace("&", "&amp;"));
  expect(html).not.toContain("12 Private Close"); // the private address never reaches the site
  const list = await page.context().newPage();
  await list.goto(`/properties?q=${token}`);
  await expect(list.getByRole("heading", { name: title })).toBeVisible();
  await list.close();
  await expect(editor(page).getByRole("link", { name: /Preview on site/ })).toHaveAttribute(
    "href",
    `/properties/${slug}`,
  );

  // ---- Rename: title + slug → the old URL 308s to the new one ----
  const newSlug = `sample-e2e-renamed-${token}`;
  await field(page, "Title").fill(renamed);
  await byId(page, "slug").fill(newSlug);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectToast(page, /Changes saved/);
  const old = await request.get(`/properties/${slug}`, { maxRedirects: 0 });
  expect(old.status()).toBe(308);
  expect(old.headers().location).toMatch(new RegExp(`/properties/${newSlug}$`));
  expect((await request.get(`/properties/${newSlug}`)).status()).toBe(200);

  // ---- Unpublish → 404 ----
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expectToast(page, /Unpublished/);
  expect((await request.get(`/properties/${newSlug}`)).status()).toBe(404);

  // ---- Delete (confirm dialog names it) → gone from the admin list ----
  await page.getByRole("button", { name: "Delete property" }).click();
  const dialog = page.getByRole("dialog", { name: `Delete “${renamed}”?` });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete property" }).click();
  await expectToast(page, /Deleted/);
  await expect(page).toHaveURL(/\/admin\/properties$/);
  await page.goto(`/admin/properties?q=${token}`);
  await expect(page.getByText("No properties match")).toBeVisible();
  expect(await findPropertyByTitle(renamed)).toBeNull();
  // Its old links no longer redirect anywhere.
  expect((await request.get(`/properties/${slug}`, { maxRedirects: 0 })).status()).toBe(404);
});

test("validation: errors show under the field, the first one is focused, summary links", async ({
  page,
}) => {
  await page.goto("/admin/properties/new");
  await byId(page, "bedrooms").fill("2.5");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(byId(page, "title-err")).toHaveText("Add a title");
  await expect(byId(page, "title")).toBeFocused();
  await expect(byId(page, "title")).toHaveAttribute("aria-invalid", "true");
  const summary = page.getByRole("alert").filter({ hasText: "things to fix" });
  await expect(summary).toBeVisible();
  await expect(byId(page, "bedrooms-err")).toContainText("whole number");
  await summary.getByRole("link", { name: "Bedrooms" }).click();
  await expect(byId(page, "bedrooms")).toBeFocused();
  await byId(page, "bedrooms").fill("");

  // Publishing needs an area and a price (or "Price on request").
  await byId(page, "title").fill("[SAMPLE] E2E never saved");
  await byId(page, "price").fill("");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(byId(page, "area-err")).toContainText("Add the area before publishing");
  await expect(byId(page, "price-err")).toContainText("Price on request");
  expect(await findPropertyByTitle("[SAMPLE] E2E never saved")).toBeNull();
});

test("fields that don't apply hide for land, rentals and off-plan", async ({ page }) => {
  await page.goto("/admin/properties/new");
  const form = page.getByRole("form", { name: "Property editor" });
  await expect(form.getByLabel("Bedrooms")).toBeVisible();
  await expect(form.getByLabel("Completion date")).toHaveCount(0);
  await expect(form.getByLabel("Per", { exact: true })).toHaveCount(0);

  await form.getByLabel("Listing type").selectOption("LAND");
  await expect(form.getByLabel("Bedrooms")).toHaveCount(0);
  await expect(form.getByLabel("Bathrooms")).toHaveCount(0);

  await form.getByLabel("Listing type").selectOption("RENT");
  await expect(form.getByLabel("Per", { exact: true })).toHaveValue("PER_YEAR");

  await form.getByLabel("Listing type").selectOption("OFF_PLAN");
  await expect(form.getByLabel("Completion date")).toBeVisible();
  await expect(form.getByLabel("Per", { exact: true })).toHaveCount(0);
});

test("list: tabs with counts, search and type filter live in the URL", async ({ page }) => {
  await page.goto("/admin/properties");
  await expect(page.getByRole("heading", { level: 1, name: "Properties" })).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "Status" });
  await expect(tabs.getByRole("link", { name: /^All \(\d+\)$/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await tabs.getByRole("link", { name: /^Drafts \(\d+\)$/ }).click();
  await expect(page).toHaveURL(/status=draft/);

  await page.getByLabel("Listing type").selectOption("land");
  await expect(page).toHaveURL(/type=land/);
  await page.getByLabel("Search properties").fill("zzz-no-such-property");
  await expect(page).toHaveURL(/q=zzz-no-such-property/);
  await expect(page.getByText("No properties match")).toBeVisible();

  await page.goto("/admin/properties?status=published");
  const firstRow = page.locator("tbody tr").first();
  if (await firstRow.count()) {
    await expect(firstRow.getByRole("link", { name: /^View .* on site/ })).toHaveAttribute(
      "href",
      /^\/properties\//,
    );
    await expect(firstRow.getByRole("link", { name: /^Edit / })).toBeVisible();
    await expect(firstRow.getByRole("button", { name: /^Delete / })).toBeVisible();
  }
  // Mobile: the table scrolls inside its box, never the page.
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scroll).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test("delete from the list asks first and names the property", async ({ page }) => {
  const title = `[SAMPLE] E2E List delete ${randomUUID().slice(0, 8)}`;
  created.push(title);
  await page.goto("/admin/properties/new");
  await byId(page, "title").fill(title);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expectToast(page, /Draft saved/);
  await expect(page).toHaveURL(/\/admin\/properties\/(?!new$)[a-z0-9]+$/);

  await page.goto(`/admin/properties?q=${encodeURIComponent(title)}`);
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  const dialog = page.getByRole("dialog", { name: `Delete “${title}”?` });
  await dialog.getByRole("button", { name: "Keep it" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: title, exact: true })).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await dialog.getByRole("button", { name: "Delete property" }).click();
  await expect(page.getByText("No properties match")).toBeVisible({ timeout: 20_000 });
});
