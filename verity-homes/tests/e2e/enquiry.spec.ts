// Enquiry pipeline end to end (Unit 7): validation, success, the saved row, the newsletter.
// Runs against the test branch; enquiry emails go to delivered@resend.dev (playwright.config.ts).
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { cleanUpE2eRows, countSubscribers, findEnquiryByName } from "./helpers/db";

const TAG = "[E2E]";
const createdEnquiries: string[] = [];
const createdSubscribers: string[] = [];

/** Own client IP per test, so runs never share the 5-per-hour rate-limit bucket. */
async function asNewVisitor(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `203.0.113.${n()}, 10.0.${n()}.${n()}` });
}

test.afterAll(async () => {
  await cleanUpE2eRows(createdEnquiries, createdSubscribers);
});

test.describe("home enquiry form", () => {
  test.beforeEach(async ({ page }) => {
    await asNewVisitor(page);
    await page.goto("/#contact");
  });

  test("shows field errors linked to the fields and focuses the first invalid one", async ({
    page,
  }) => {
    const form = page.locator("#enquiry");
    await form.getByRole("button", { name: "Send enquiry" }).click();

    const name = form.getByLabel("Full name");
    const phone = form.getByLabel("Phone / WhatsApp");
    await expect(form.getByText("Enter your name")).toBeVisible();
    await expect(form.getByText("Enter your phone number")).toBeVisible();
    await expect(name).toHaveAttribute("aria-invalid", "true");
    await expect(name).toHaveAccessibleDescription("Enter your name");
    await expect(phone).toHaveAccessibleDescription("Enter your phone number");
    await expect(name).toBeFocused();
    await expect(form.getByRole("alert")).toContainText(/check the highlighted fields/i);
  });

  test("sends: success message, form reset, row saved with emailSentAt", async ({ page }) => {
    const form = page.locator("#enquiry");
    const visitor = `${TAG} ${randomUUID().slice(0, 8)}`;
    createdEnquiries.push(visitor);
    await form.getByLabel("Full name").fill(visitor);
    await form.getByLabel("Phone / WhatsApp").fill("0803 000 0000");
    await form.getByLabel("Email").fill("e2e@e2e-test.example");
    await form.getByText("Land", { exact: true }).click();
    await form.getByLabel("Message").fill("E2E test enquiry — please ignore.");
    await page.waitForTimeout(3_100); // minimum fill time (anti-bot)

    const send = form.getByRole("button", { name: /send enquiry|sending/i });
    await send.click();
    await expect(form.getByRole("status")).toContainText(/thank you/i, { timeout: 20_000 });
    await expect(form.getByLabel("Full name")).toHaveValue("");

    const row = await findEnquiryByName(visitor);
    expect(row, "enquiry row saved").not.toBeNull();
    expect(row).toMatchObject({
      phone: "2348030000000",
      email: "e2e@e2e-test.example",
      interest: "LAND",
      source: "HOME_PAGE",
    });
    expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
    // Resend accepted the notification (sent to delivered@resend.dev in e2e).
    expect(row?.emailSentAt, "emailSentAt set: Resend accepted the email").not.toBeNull();
  });
});

test("newsletter sign-up saves the subscriber", async ({ page }) => {
  await asNewVisitor(page);
  await page.goto("/");
  const email = `n-${randomUUID().slice(0, 8)}@e2e-test.example`;
  createdSubscribers.push(email);
  const input = page.getByLabel("Email for new listings");
  await input.scrollIntoViewIfNeeded();
  await input.fill(email);
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText("You're on the list", { exact: false })).toBeVisible();
  expect(await countSubscribers(email)).toBe(1);
});
