import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";
import { deleteE2ePlans, planByName } from "./db";

// Unit 17c: a plan with 3 packages, end to end on the TEST database: admin → publish → summary
// card on the home page → plan page rows (gain, % per year) → Select ₦20M → enquiry with
// packageId + message → the inbox shows the package → "guaranteed" refused → unpublish → 404.
// Called from admin-plans.spec.ts in its serial group (desktop only): plans are site-wide, and
// two flows publishing at once can race the /invest rebuild. The plan is "[SAMPLE] E2E Plan …"
// and is removed in a finally (the global teardown also sweeps it, its redirects and the
// "[SAMPLE] E2E …" enquiry).

const db = () => neon(process.env.DATABASE_URL!);

const PACKAGES = [
  { amount: "10000000", receive: "10500000", gain: "₦500,000", pct: "5.0%" },
  { amount: "20000000", receive: "21000000", gain: "₦1,000,000", pct: "5.0%" },
  { amount: "30000000", receive: "32500000", gain: "₦2,500,000", pct: "8.3%" },
];

const editor = (page: Page) => page.getByRole("form", { name: "Plan editor" });
const byId = (page: Page, id: string) => editor(page).locator(`[id$="f-${id}"]`);
const toast = (page: Page, text: RegExp) =>
  expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });

export async function planPackagesFlow(page: Page) {
  const token = randomUUID().slice(0, 8);
  const name = `[SAMPLE] E2E Plan ${token}`;
  const slug = `sample-e2e-plan-${token}`;
  const buyer = `[SAMPLE] E2E Investor ${token}`;
  try {
    // ---- Admin: plan page fields + 3 packages, live preview ----
    await page.goto("/admin/plans/new");
    await byId(page, "name").fill(name);
    await expect(byId(page, "slug")).toHaveValue(slug); // follows the name
    await editor(page).getByLabel("Payout", { exact: true }).selectOption("AT_MATURITY");
    await byId(page, "partnerName").fill("[SAMPLE] E2E Partner");
    await byId(page, "contractWith").fill("[SAMPLE] E2E Company Ltd");
    await byId(page, "description").fill("**Project** details.\n\n- First point");
    await byId(page, "payoutTerms").fill("Paid at maturity, per your signed agreement.");
    await byId(page, "exitTerms").fill("Early exit by written notice.");
    const panel = editor(page).getByTestId("plan-packages");
    for (const [i, p] of PACKAGES.entries()) {
      await panel.getByRole("button", { name: "Add a package" }).click();
      await byId(page, `packages-${i}-amount`).pressSequentially(p.amount);
      await byId(page, `packages-${i}-receive`).pressSequentially(p.receive);
      await expect(byId(page, `packages-${i}-tenureMonths`)).toHaveValue("12");
      await expect(panel.getByTestId(`package-preview-${i}`)).toHaveText(
        `Gain ${p.gain} · ${p.pct} per year`,
      );
    }
    await expect(byId(page, "packages-1-amount")).toHaveValue("20,000,000");
    await expect(editor(page).getByTestId("terms-from-packages")).toBeVisible();
    await expect(editor(page).getByLabel("Minimum investment")).toBeDisabled();

    // receive ≤ invest is refused under the row
    await byId(page, "packages-2-receive").fill("");
    await byId(page, "packages-2-receive").pressSequentially("30000000");
    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await expect(editor(page).locator('[id$="f-packages-2-receive-err"]')).toContainText(
      "more than what they invest",
    );
    await byId(page, "packages-2-receive").fill("");
    await byId(page, "packages-2-receive").pressSequentially("32500000");

    await editor(page).getByRole("button", { name: "Save draft" }).click();
    await toast(page, /Draft saved/);
    await expect(page).toHaveURL(/\/admin\/plans\/(?!new$)[a-z0-9]+$/);
    await editor(page).getByRole("button", { name: "Publish", exact: true }).click();
    await toast(page, /Published/);
    expect(await planByName(name)).toMatchObject({
      status: "PUBLISHED",
      minimumKobo: "1000000000",
    });

    // ---- Home: a summary card only ----
    const pub = await page.context().newPage();
    await pub.goto("/");
    const card = pub.locator("#invest article", { hasText: name });
    await expect(card).toContainText("Invest from");
    await expect(card).toContainText("₦10,000,000");
    await expect(card).toContainText("12 months");
    await expect(card).not.toContainText("₦21,000,000");
    await expect(card).not.toContainText("%");
    await expect(card.getByRole("link", { name: /View plan/ })).toHaveAttribute(
      "href",
      `/invest/${slug}`,
    );

    // ---- Plan page: 3 rows with gain and % per year ----
    await pub.goto(`/invest/${slug}`);
    await expect(pub.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(pub.getByTestId("plan-partner")).toContainText("[SAMPLE] E2E Partner");
    await expect(pub.getByTestId("plan-contract")).toContainText(
      "Your agreement is with [SAMPLE] E2E Company Ltd",
    );
    await expect(pub).toHaveTitle(new RegExp(token));
    const rows = pub
      .getByRole("table", { name: "Investment packages" })
      .locator("[data-package-amount]");
    await expect(rows).toHaveCount(3);
    for (const [i, p] of PACKAGES.entries()) {
      await expect(rows.nth(i).locator('[data-cell="gain"]')).toContainText(p.gain);
      await expect(rows.nth(i).locator('[data-cell="per-year"]')).toContainText(p.pct);
    }
    await expect(pub.locator("main strong", { hasText: "Project" })).toBeVisible(); // Markdown
    await expect(pub.getByTestId("plan-terms")).toContainText("Early exit by written notice.");
    await expect(
      pub.getByText(/Investment returns are subject to the terms/).first(),
    ).toBeVisible();

    // ---- Select ₦20M → form prefilled, packageId set, WhatsApp names it ----
    const row20 = pub.locator('[data-package-amount="20000000"]');
    await row20.getByRole("button", { name: /Select/ }).click();
    await expect(row20.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await expect(pub.locator("#start")).toBeInViewport();
    const form = pub.getByRole("form", { name: "Investment enquiry" });
    const expected =
      "I'm interested in the ₦20,000,000 package (receive ₦21,000,000 after 12 months)";
    await expect(form.getByLabel("Message")).toHaveValue(
      new RegExp(`^${expected.replace(/[()]/g, "\\$&")}`),
    );
    await expect(form.getByLabel("Amount (₦)")).toHaveValue("20,000,000");
    const packageId = await form.getByTestId("package-id").inputValue();
    expect(packageId).toMatch(/^[a-z0-9]+$/);
    const wa = pub.getByRole("link", { name: /Chat on WhatsApp/ });
    if ((await wa.getAttribute("href"))?.startsWith("https://"))
      expect(decodeURIComponent((await wa.getAttribute("href"))!)).toContain("₦20,000,000 package");

    await pub.setExtraHTTPHeaders({ "x-forwarded-for": `198.51.100.${Date.now() % 250}` });
    await form.getByLabel(/full name/i).fill(buyer);
    await form.getByLabel(/phone/i).fill("08030000000");
    await pub.waitForTimeout(3_100); // minimum fill time (anti-bot)
    await form.getByRole("button", { name: "Request a call back" }).click();
    await expect(pub.getByRole("status").filter({ hasText: /thank you/i })).toBeVisible({
      timeout: 20_000,
    });
    const saved = (await db()`
      SELECT e."packageId", e.message, e.source::text AS source, p."amountKobo"::text AS amount
      FROM "Enquiry" e JOIN "InvestmentPackage" p ON p.id = e."packageId"
      WHERE e.name = ${buyer}`) as {
      packageId: string;
      message: string;
      source: string;
      amount: string;
    }[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ packageId, source: "INVEST_PAGE", amount: "2000000000" });
    expect(saved[0]!.message).toContain(expected);

    // ---- The inbox shows the package ----
    const inbox = await page.context().newPage();
    await inbox.goto(`/admin/enquiries?q=${encodeURIComponent(`E2E Investor ${token}`)}`);
    const inboxRow = inbox.locator("tbody tr", { hasText: `E2E Investor ${token}` });
    await expect(inboxRow).toContainText("₦20,000,000 package");
    const detailHref = await inboxRow
      .getByRole("link", { name: new RegExp(`E2E Investor ${token}`) })
      .getAttribute("href");
    // (retried: a dropped database connection can leave the panel empty on the first load)
    await expect(async () => {
      await inbox.goto(detailHref!);
      await expect(inbox.getByTestId("enquiry-package")).toHaveText(
        "₦20,000,000 package — receive ₦21,000,000 after 12 months",
        { timeout: 5_000 },
      );
    }).toPass({ timeout: 40_000 });
    await inbox.close();

    // ---- "guaranteed" in the description is refused ----
    await page.reload();
    await byId(page, "description").fill("Returns are guaranteed.");
    await editor(page).getByRole("button", { name: "Save changes" }).click();
    await expect(editor(page).locator('[id$="f-description-err"]')).toContainText(
      "Please don't use “guarantee” or “guaranteed”",
    );
    await byId(page, "description").fill("**Project** details.");

    // ---- Unpublish → the plan page is 404 ----
    page.once("dialog", (d) => void d.accept());
    await editor(page).getByRole("button", { name: "Unpublish" }).click();
    await toast(page, /Unpublished/);
    await expect(async () => {
      const res = await pub.goto(`/invest/${slug}`);
      expect(res?.status()).toBe(404);
    }).toPass({ timeout: 20_000 });
    await pub.close();
  } finally {
    await db()`DELETE FROM "Enquiry" WHERE name = ${buyer}`;
    // Only this plan: it changes no other plan's highlight or order, and another worker's
    // "[SAMPLE] E2E …" plan may be mid-test.
    await deleteE2ePlans([name]);
  }
}
