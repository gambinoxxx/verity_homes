import { randomUUID } from "node:crypto";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { blobExists, deleteE2ePhotos } from "./helpers/blob";
import {
  cleanUpE2eProperties,
  insertE2eProperty,
  propertyLocation,
  propertyPhotos,
} from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";

// Unit 15: property photos (Vercel Blob, under e2e/) and the map picker, against the TEST
// database. Each test makes its own published "[SAMPLE] E2E …" property and removes it — and
// every Blob file under e2e/properties/<id>/ — afterwards.

const SAMPLES = path.resolve("public/samples");
const created: { id: string; title: string; uploads?: boolean }[] = [];

test.afterAll(async () => {
  for (const p of created) if (p.uploads) await deleteE2ePhotos(p.id);
  await cleanUpE2eProperties(created.map((p) => p.title));
});

async function newProperty(label: string, uploads = false) {
  const token = randomUUID().slice(0, 8);
  const title = `[SAMPLE] E2E ${label} ${token}`;
  const p = await insertE2eProperty(title, `sample-e2e-${label.toLowerCase()}-${token}`);
  created.push({ id: p.id, title, uploads });
  return { ...p, title };
}

const editor = (page: Page) => page.getByRole("form", { name: "Property editor" });

async function saveChanges(page: Page) {
  await editor(page).getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: "Changes saved" }).first(),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("upload 2 → alt text → reorder → save → public page; remove one → gone from page and Blob", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const p = await newProperty("Photos", true);
    await page.goto(`/admin/properties/${p.id}`);
    const photos = editor(page).getByRole("list", { name: "Photos" });

    // ---- Upload two images (resized in the browser, uploaded to Blob, rows saved) ----
    await editor(page)
      .getByTestId("photo-file-input")
      .setInputFiles([path.join(SAMPLES, "villa.jpg"), path.join(SAMPLES, "dusk.jpg")]);
    const uploads = editor(page).getByRole("list", { name: "Uploads" });
    await expect(uploads.locator('li[data-status="done"]')).toHaveCount(2, { timeout: 90_000 });
    for (const bar of await uploads.locator("progress").all()) {
      await expect(bar).toHaveAttribute("value", "100");
    }
    await expect(photos.getByRole("listitem")).toHaveCount(2);
    await expect(photos.getByRole("listitem").first().getByText("Cover")).toBeVisible();
    await expect(editor(page).getByText("2 photos have no description")).toBeVisible();

    const rows = await propertyPhotos(p.id);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.url).toMatch(
        new RegExp(`\\.public\\.blob\\.vercel-storage\\.com/e2e/properties/${p.id}/`),
      );
      expect(r.width).toBeLessThanOrEqual(2400);
    }
    const [villa, dusk] = rows;

    // ---- Alt text + reorder (dusk becomes the cover) → save ----
    await editor(page).getByLabel("Alt text for photo 1").fill("E2E villa front");
    await editor(page).getByLabel("Alt text for photo 2").fill("E2E dusk entrance");
    await expect(editor(page).getByText(/no description/)).toHaveCount(0);
    await editor(page).getByRole("button", { name: "Move photo 2 up" }).click();
    await expect(editor(page).getByLabel("Alt text for photo 1")).toHaveValue("E2E dusk entrance");
    await saveChanges(page);
    expect((await propertyPhotos(p.id)).map((r) => [r.id, r.alt])).toEqual([
      [dusk!.id, "E2E dusk entrance"],
      [villa!.id, "E2E villa front"],
    ]);

    // ---- Public page: both, in the new order, with the alt text ----
    const pub = await page.context().newPage();
    await pub.goto(`/properties/${p.slug}`);
    const alts = await pub
      .locator("main img")
      .evaluateAll((imgs) =>
        imgs.map((i) => i.getAttribute("alt")).filter((a) => a?.startsWith("E2E")),
      );
    expect(alts.slice(0, 2)).toEqual(["E2E dusk entrance", "E2E villa front"]);

    // ---- Remove one, then leave without saving → nothing lost ----
    page.once("dialog", (d) => void d.accept());
    await editor(page).getByRole("button", { name: "Remove photo 2" }).click();
    await expect(photos.getByRole("listitem")).toHaveCount(1);
    await page.getByRole("link", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/admin\/properties$/);
    expect(await propertyPhotos(p.id)).toHaveLength(2);
    expect(await blobExists(villa!.url)).toBe(true);

    // ---- Remove it again and save → gone from the page and from Blob ----
    await page.goto(`/admin/properties/${p.id}`);
    await editor(page).getByRole("button", { name: "Remove photo 2" }).click();
    await saveChanges(page);
    expect((await propertyPhotos(p.id)).map((r) => r.id)).toEqual([dusk!.id]);
    await expect.poll(() => blobExists(villa!.url), { timeout: 20_000 }).toBe(false);
    await pub.goto(`/properties/${p.slug}`);
    await expect(pub.locator('main img[alt="E2E villa front"]')).toHaveCount(0);
    await expect(pub.locator('main img[alt="E2E dusk entrance"]').first()).toBeVisible();
    await pub.close();
  });

  test("an unsupported format gets a friendly message", async ({ page }) => {
    const p = await newProperty("Heic");
    await page.goto(`/admin/properties/${p.id}`);
    await editor(page)
      .getByTestId("photo-file-input")
      .setInputFiles({
        name: "IMG_0001.HEIC",
        mimeType: "image/heic",
        buffer: Buffer.from("not a jpeg"),
      });
    await expect(
      editor(page).getByText("This photo format isn't supported — please upload JPG, PNG or WebP."),
    ).toBeVisible({ timeout: 20_000 });
    expect(await propertyPhotos(p.id)).toHaveLength(0);
  });

  test("new properties: save the draft first to add photos", async ({ page }) => {
    await page.goto("/admin/properties/new");
    await expect(editor(page).getByTestId("photos-save-first")).toContainText(
      "Save the draft first to add photos.",
    );
  });

  test("map: click sets lat/lng; the public map uses them only with 'show exact location'", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const p = await newProperty("Map");
    await page.goto(`/admin/properties/${p.id}`);
    const lat = editor(page).getByLabel("Latitude");
    const lng = editor(page).getByLabel("Longitude");
    await expect(lat).toHaveValue("");

    const map = editor(page).getByTestId("map-picker").locator(".leaflet-container");
    await expect(map).toBeVisible({ timeout: 20_000 });
    await map.click({ position: { x: 120, y: 90 } });
    await expect(lat).toHaveValue(/^-?\d+\.\d{6}$/);
    await expect(lng).toHaveValue(/^-?\d+\.\d{6}$/);
    await expect(editor(page).locator(".leaflet-marker-icon")).toBeVisible();

    // Typing coordinates moves the pin (its position changes).
    const pin = editor(page).locator(".leaflet-marker-icon");
    const before = await pin.boundingBox();
    await lat.fill("6.500000");
    await lng.fill("3.380000");
    await expect
      .poll(async () => JSON.stringify(await pin.boundingBox()))
      .not.toBe(JSON.stringify(before));

    // Exact location ON → the public map uses the coordinates.
    await editor(page)
      .getByRole("switch", { name: /Show exact location/ })
      .check();
    await saveChanges(page);
    expect(await propertyLocation(p.id)).toMatchObject({
      latitude: "6.500000",
      longitude: "3.380000",
      showExactLocation: true,
    });
    const pub = await page.context().newPage();
    await pub.goto(`/properties/${p.slug}`);
    const iframe = pub.locator('iframe[title*="map" i]');
    expect(decodeURIComponent((await iframe.getAttribute("src")) ?? "")).toContain("q=6.5,3.38");

    // OFF → only the area.
    await editor(page)
      .getByRole("switch", { name: /Show exact location/ })
      .uncheck();
    await saveChanges(page);
    await pub.goto(`/properties/${p.slug}`);
    const src = decodeURIComponent((await iframe.getAttribute("src")) ?? "");
    expect(src).toContain("q=Yaba, Lagos");
    expect(src).not.toContain("6.5");
    await pub.close();
  });
});

test.describe("upload route access", () => {
  const body = {
    type: "blob.generate-client-token",
    payload: {
      pathname: "e2e/properties/abcdefgh1234/x.jpg",
      multipart: false,
      clientPayload: null,
    },
  };

  test.describe("viewer", () => {
    test.use({ storageState: storageStateFor("viewer") });
    test("gets 403", async ({ page }) => {
      // A page load first: it refreshes the short-lived session cookie (API calls don't).
      expect((await page.goto("/admin"))?.status()).toBe(403);
      const res = await page.request.post("/api/blob/upload", { data: body });
      expect(res.status()).toBe(403);
    });
  });

  test("signed out gets 401", async ({ request }) => {
    const res = await request.post("/api/blob/upload", { data: body });
    expect(res.status()).toBe(401);
  });
});
