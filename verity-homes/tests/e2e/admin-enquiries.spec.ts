import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  aPublishedProperty,
  deleteE2eEnquiries,
  enquiryState,
  insertE2eEnquiries,
  newEnquiryCount,
} from "./helpers/db";
import { storageStateFor } from "./setup/clerk-users";

// Unit 16: admin enquiries inbox against the TEST database. Each test inserts its own
// "[SAMPLE] E2E <token> …" enquiries (unique per test and project) and deletes them after;
// searching for the token keeps every assertion to this test's rows.

const created: string[] = [];
test.afterAll(async () => {
  await deleteE2eEnquiries(created);
});

async function fixtures() {
  const token = randomUUID().slice(0, 8);
  const property = await aPublishedProperty();
  const ids = await insertE2eEnquiries([
    {
      name: `[SAMPLE] E2E ${token} Ada Obi`,
      phone: "2348030000001",
      email: "ada.e2e@example.com",
      interest: "BUYING",
      message: `Is it still available? I'd like to inspect on Saturday. ${token}`,
      source: "PROPERTY_PAGE",
      propertyId: property.id,
      wantsInspection: true,
      minutesAgo: 5,
    },
    {
      name: `[SAMPLE] E2E ${token} Bola Ade`,
      phone: "2348030000002",
      interest: "INVESTING",
      amountKobo: 500_000_000n,
      message: `=HYPERLINK("http://evil.example","click") ${token}`,
      source: "INVEST_PAGE",
      minutesAgo: 60,
    },
    {
      name: `[SAMPLE] E2E ${token} Chi Eze`,
      phone: "2348030000003",
      interest: "LAND",
      status: "CONTACTED",
      message: `Any plots in Ibeju-Lekki? ${token}`,
      minutesAgo: 120,
    },
  ]);
  created.push(...ids);
  const [ada, bola, chi] = ids as [string, string, string];
  return { token, property, ada, bola, chi };
}

const table = (page: Page) => page.getByRole("region", { name: "Enquiries" });
const rows = (page: Page) => table(page).locator("tbody tr");
const detail = (page: Page) => page.getByTestId("enquiry-detail");
const tab = (page: Page, label: string) =>
  page
    .getByRole("navigation", { name: "Status" })
    .getByRole("link", { name: new RegExp(`^${label} \\(`) });
const toast = (page: Page, text: RegExp) =>
  expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });

test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("search, status tabs and interest filter update the URL and the results", async ({
    page,
  }) => {
    const f = await fixtures();
    await page.goto(`/admin/enquiries?q=${f.token}`);
    await expect(page.getByRole("heading", { level: 1, name: "Enquiries" })).toBeVisible();
    await expect(rows(page)).toHaveCount(3);
    // newest first
    await expect(rows(page).first()).toContainText("Ada Obi");
    await expect(rows(page).last()).toContainText("Chi Eze");
    await expect(tab(page, "All")).toHaveText("All (3)");
    await expect(tab(page, "New")).toHaveText("New (2)");
    await expect(tab(page, "Contacted")).toHaveText("Contacted (1)");
    await expect(tab(page, "Closed")).toHaveText("Closed (0)");

    await tab(page, "New").click();
    await expect(page).toHaveURL(/status=new/);
    await expect(rows(page)).toHaveCount(2);

    await page.getByLabel("Interested in").selectOption("investing");
    await expect(page).toHaveURL(/interest=investing/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Bola Ade");

    // search by phone (typed the way people write it) and by message text
    await page.goto(`/admin/enquiries?q=${f.token}`);
    await page.getByLabel("Search enquiries").fill("0803 000 0003");
    await expect(page).toHaveURL(/q=0803/);
    await expect(rows(page).filter({ hasText: f.token })).toHaveCount(1);
    await page.getByLabel("Search enquiries").fill(`plots in Ibeju-Lekki? ${f.token}`);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Chi Eze");

    await page.getByLabel("Search enquiries").fill(`zzz-${f.token}`);
    await expect(page.getByText("No enquiries match")).toBeVisible();
  });

  test("open → details; contacted → close → reopen; note persists; badge + counts update", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const f = await fixtures();
    await page.goto(`/admin/enquiries?q=${f.token}`);
    await rows(page)
      .filter({ hasText: "Ada Obi" })
      .getByRole("link", { name: /Ada Obi/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`id=${f.ada}`));

    const d = detail(page);
    await expect(d.getByRole("heading", { name: /Ada Obi/ })).toBeVisible();
    await expect(d.getByText("EO", { exact: true })).toBeVisible(); // initials: first + last word
    await expect(d.getByRole("link", { name: "+234 803 000 0001" })).toHaveAttribute(
      "href",
      "tel:+2348030000001",
    );
    await expect(d.getByRole("link", { name: "ada.e2e@example.com" })).toHaveAttribute(
      "href",
      "mailto:ada.e2e@example.com",
    );
    await expect(d.getByRole("link", { name: f.property.title })).toHaveAttribute(
      "href",
      `/properties/${f.property.slug}`,
    );
    await expect(d.locator("dt", { hasText: "Inspection" })).toBeVisible();
    await expect(d.getByText("Requested")).toBeVisible();
    await expect(d.getByText(/via property page/)).toBeVisible();
    await expect(d.getByText(/I'd like to inspect on Saturday/)).toBeVisible();
    const wa = d.getByRole("link", { name: /WhatsApp/ });
    await expect(wa).toHaveAttribute(
      "href",
      `https://wa.me/2348030000001?text=${encodeURIComponent(
        `Hi E2E, thank you for your enquiry about ${f.property.title}.`,
      )}`,
    );
    await expect(d.getByRole("link", { name: "Email" })).toBeVisible();
    // Opening it changed nothing.
    expect(await enquiryState(f.ada)).toMatchObject({ status: "NEW" });

    // ---- Mark contacted → badge, tab counts and the sidebar badge update ----
    await d.getByRole("button", { name: "Mark contacted" }).click();
    await toast(page, /Marked as contacted/);
    await expect(rows(page).filter({ hasText: "Ada Obi" })).toContainText("Contacted");
    await expect(tab(page, "New")).toHaveText("New (1)");
    await expect(tab(page, "Contacted")).toHaveText("Contacted (2)");
    expect(await enquiryState(f.ada)).toMatchObject({ status: "CONTACTED" });
    await expect(async () => {
      const n = await newEnquiryCount();
      const badge = page.getByTestId("new-enquiries-badge");
      if (n === 0) await expect(badge).toHaveCount(0);
      else expect(await badge.textContent()).toBe(`${n} new`);
    }).toPass({ timeout: 20_000 });

    // ---- Private note: saves on blur, persists after reload ----
    const note = d.getByLabel("Private note");
    await note.fill("Inspection booked for Saturday 11am");
    await d.getByRole("heading", { name: /Ada Obi/ }).click(); // blur
    await expect(d.getByText("Saved", { exact: true })).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(detail(page).getByLabel("Private note")).toHaveValue(
      "Inspection booked for Saturday 11am",
    );

    // ---- Close → Reopen ----
    await detail(page).getByRole("button", { name: "Close" }).click();
    await toast(page, /Enquiry closed/);
    await expect(rows(page).filter({ hasText: "Ada Obi" })).toContainText("Closed");
    await expect(tab(page, "Closed")).toHaveText("Closed (1)");
    await detail(page).getByRole("button", { name: "Reopen" }).click();
    await toast(page, /Marked as contacted/);
    await expect(rows(page).filter({ hasText: "Ada Obi" })).toContainText("Contacted");
    expect(await enquiryState(f.ada)).toEqual({
      status: "CONTACTED",
      note: "Inspection booked for Saturday 11am",
    });
  });

  test("investment enquiry shows the amount; no email → no Email button", async ({ page }) => {
    const f = await fixtures();
    await page.goto(`/admin/enquiries?q=${f.token}&id=${f.bola}`);
    const d = detail(page);
    await expect(d.getByText("₦5,000,000")).toBeVisible();
    await expect(d.getByText("Not given")).toBeVisible();
    await expect(d.getByRole("link", { name: "Email" })).toHaveCount(0);
    await expect(d.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/2348030000002\?text=Hi%20E2E%2C%20thank%20you%20for%20your%20enquiry%20about%20Verity%20Homes\.$/,
    );
  });

  test("CSV export: the filtered rows, Lagos times, formula guard", async ({ page }) => {
    const f = await fixtures();
    await page.goto(`/admin/enquiries?q=${f.token}&status=new`);
    const link = page.getByRole("link", { name: "Export CSV" });
    await expect(link).toHaveAttribute(
      "href",
      `/api/admin/enquiries/export?status=new&q=${f.token}`,
    );
    const download = page.waitForEvent("download");
    await link.click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^enquiries-\d{4}-\d{2}-\d{2}\.csv$/);

    const res = await page.request.get(`/api/admin/enquiries/export?status=new&q=${f.token}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="enquiries-/);
    const csv = await res.text();
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe(
      "Received (Lagos),Name,Phone,Email,Interest,Property / plan,Status,Message,Note",
    );
    expect(lines).toHaveLength(3); // header + the two NEW ones (Chi is contacted)
    expect(csv).toContain(`[SAMPLE] E2E ${f.token} Ada Obi`);
    expect(csv).toContain(`[SAMPLE] E2E ${f.token} Bola Ade`);
    expect(csv).not.toContain("Chi Eze");
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"",""click"") ${f.token}"`);
    expect(lines[1]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2},/);
  });

  test("mobile: the detail opens full-screen and Back returns to the list", async ({ page }) => {
    test.skip(page.viewportSize()!.width > 860, "phones only");
    const f = await fixtures();
    await page.goto(`/admin/enquiries?q=${f.token}`);
    await rows(page)
      .filter({ hasText: "Chi Eze" })
      .getByRole("link", { name: /Chi Eze/ })
      .click();
    const d = detail(page);
    await expect(d).toBeVisible();
    const box = await d.boundingBox();
    const vp = page.viewportSize()!;
    expect(box).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height });
    await d.getByRole("link", { name: "← Back to enquiries" }).click();
    await expect(page).not.toHaveURL(/id=/);
    await expect(page.getByTestId("enquiry-detail")).toHaveCount(0);
    await expect(rows(page)).toHaveCount(3);
  });
});

test.describe("access", () => {
  test.describe("viewer", () => {
    test.use({ storageState: storageStateFor("viewer") });
    test("403 on the page and on the CSV route", async ({ page }) => {
      expect((await page.goto("/admin/enquiries"))?.status()).toBe(403);
      const res = await page.request.get("/api/admin/enquiries/export");
      expect(res.status()).toBe(403);
      expect(await res.text()).not.toContain("Received (Lagos)");
    });
  });

  test("signed out: the CSV route is 401", async ({ request }) => {
    const res = await request.get("/api/admin/enquiries/export");
    expect(res.status()).toBe(401);
  });
});
