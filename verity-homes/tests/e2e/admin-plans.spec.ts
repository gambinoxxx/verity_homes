import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  deleteE2eFaqs,
  highlightedPlanNames,
  planByName,
  restorePlans,
  snapshotPlans,
} from "./helpers/db";
import { planPackagesFlow } from "./helpers/plan-packages-flow";
import { storageStateFor } from "./setup/clerk-users";

// Unit 17: admin plans + FAQs against the TEST database. Plans and FAQs are site-wide (one gold
// card, one order), so the flows that change them run in the admin-desktop project only, and
// the original gold card + order are restored afterwards. Rows are "[SAMPLE] E2E …".

// Each site-wide test snapshots what it changes and restores it in a finally (not file hooks:
// with parallel workers, another worker's afterAll would run mid-test).
const toast = (page: Page, text: RegExp) =>
  expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible({
    timeout: 20_000,
  });
const plansRegion = (page: Page) => page.getByRole("region", { name: /Choose your plan/ });
const cardNames = (page: Page) =>
  plansRegion(page)
    .locator("article h3")
    .evaluateAll((hs) => hs.map((h) => h.textContent?.trim() ?? ""));

test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });
  // The plan and FAQ flows both rebuild /invest; run them one after the other so one test's
  // page rebuild can't race the other's publish (they share the page's cache).
  test.describe.configure({ mode: "serial" });

  test("plan: draft → publish → highlight → reorder → guarantee check → unpublish → delete", async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width < 800, "site-wide changes: desktop project only");
    test.setTimeout(240_000);
    const snapshot = await snapshotPlans();
    const name = `[SAMPLE] E2E Plan ${randomUUID().slice(0, 8)}`;
    try {
      await planFlow(page, name);
    } finally {
      await restorePlans(snapshot, [name]); // the original gold card + order; this plan removed
    }
  });

  // Unit 17c: admin → publish → home summary card → plan page rows → Select ₦20M → enquiry with
  // packageId + message → inbox → “guaranteed” refused → unpublish → 404.
  test("packages: 3 packages → summary card → plan page → select ₦20M → enquiry → inbox → 404", async ({
    page,
  }) => {
    test.skip(page.viewportSize()!.width < 800, "site-wide changes: desktop project only");
    test.setTimeout(240_000);
    await planPackagesFlow(page);
  });

  test("FAQ: add → publish → on /invest → edit → reorder → delete", async ({ page }) => {
    test.skip(page.viewportSize()!.width < 800, "site-wide changes: desktop project only");
    test.setTimeout(180_000);
    try {
      await faqFlow(page);
    } finally {
      await deleteE2eFaqs();
    }
  });

  test("plans list and FAQs page render, with tables scrolling inside their box", async ({
    page,
  }) => {
    await listsRender(page);
  });
});

async function planFlow(page: Page, name: string) {
  const editor = page.getByRole("form", { name: "Plan editor" });

  // ---- Draft ----
  await page.goto("/admin/plans/new");
  await expect(page.getByRole("heading", { level: 1, name: "Add plan" })).toBeVisible();
  await expect(editor.getByTestId("plan-disclaimer")).toContainText(
    "Investment returns are subject to the terms",
  );
  await editor.getByLabel("Plan name").fill(name);
  await editor.getByLabel("Minimum investment").pressSequentially("2500000");
  await expect(editor.getByLabel("Minimum investment")).toHaveValue("2,500,000");
  await editor.getByLabel("Tenure (months)").fill("6");
  await editor.getByLabel("Payout", { exact: true }).selectOption("MONTHLY");
  await editor.getByRole("button", { name: "Save draft" }).click();
  await toast(page, /Draft saved/);
  await expect(page).toHaveURL(/\/admin\/plans\/(?!new$)[a-z0-9]+$/);
  expect(await planByName(name)).toMatchObject({ status: "DRAFT", minimumKobo: "250000000" });

  const pub = await page.context().newPage();
  await pub.goto("/invest");
  await expect(plansRegion(pub).locator("article", { hasText: name })).toHaveCount(0);

  // ---- Publish needs a package, the agreement and payout terms (Unit 17c) ----
  const ed0 = page.getByRole("form", { name: "Plan editor" });
  await ed0.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(ed0.locator('[id$="f-packages-err"]')).toContainText("Add at least one package");
  expect(await planByName(name)).toMatchObject({ status: "DRAFT" });
  await ed0.getByRole("button", { name: "Add a package" }).click();
  await ed0.locator('[id$="f-packages-0-amount"]').pressSequentially("2500000");
  await ed0.locator('[id$="f-packages-0-receive"]').pressSequentially("2600000");
  await ed0.locator('[id$="f-packages-0-tenureMonths"]').fill("6");
  await ed0.getByLabel("Agreement with").fill("[SAMPLE] E2E Company Ltd");
  await ed0.getByLabel("Payout terms").fill("Paid at maturity, per your signed agreement.");

  // ---- Publish → /invest and the home page, “Invest from” the package ----
  await ed0.getByRole("button", { name: "Publish", exact: true }).click();
  await toast(page, /Published/);
  await pub.goto("/invest");
  const card = plansRegion(pub).locator("article", { hasText: name });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("₦2,500,000");
  await expect(card.getByRole("link", { name: /View plan/ })).toHaveAttribute(
    "href",
    /^\/invest\/sample-e2e-plan-/,
  );
  await pub.goto("/");
  await expect(pub.locator("#invest article", { hasText: name })).toContainText("₦2,500,000");

  // ---- Highlight → it becomes the gold card; the previous one doesn't ----
  const before = await highlightedPlanNames();
  const ed = page.getByRole("form", { name: "Plan editor" });
  await ed.getByRole("switch", { name: /Highlighted/ }).check();
  if (before[0])
    await expect(ed.getByTestId("highlight-note")).toContainText(`turns it off for “${before[0]}”`);
  await ed.getByRole("button", { name: "Save changes" }).click();
  await toast(page, /Changes saved/);
  expect(await highlightedPlanNames()).toEqual([name]);
  await pub.goto("/invest");
  const gold = plansRegion(pub).locator("article[data-highlighted]");
  await expect(gold).toHaveCount(1);
  await expect(gold).toContainText(name);
  for (const old of before) {
    await expect(plansRegion(pub).locator("article", { hasText: old })).not.toHaveAttribute(
      "data-highlighted",
      "",
    );
  }

  // ---- Reorder (↑) → the /invest order changes ----
  await page.goto("/admin/plans");
  const row = page.locator("tbody tr", { hasText: name });
  await expect(row).toBeVisible();
  await pub.goto("/invest");
  const orderBefore = await cardNames(pub);
  const at = orderBefore.indexOf(name);
  expect(at).toBeGreaterThan(0); // new plans go to the end
  await row.getByRole("button", { name: `Move ${name} up` }).click();
  await toast(page, /Order saved/);
  await expect(async () => {
    await pub.goto("/invest");
    const after = await cardNames(pub);
    expect(after.indexOf(name)).toBe(at - 1);
  }).toPass({ timeout: 20_000 });

  // ---- "guaranteed" is refused, with the message under the field ----
  await row.getByRole("link", { name: `Edit ${name}` }).click();
  const ed2 = page.getByRole("form", { name: "Plan editor" });
  await ed2.getByLabel("Summary").fill("Guaranteed returns every quarter");
  await ed2.getByRole("button", { name: "Save changes" }).click();
  const summaryErr = ed2.locator('[id$="f-summary-err"]');
  await expect(summaryErr).toContainText("Please don't use “guarantee” or “guaranteed”");
  await expect(ed2.getByLabel("Summary")).toBeFocused();
  await ed2.getByLabel("Summary").fill("For first-time investors.");

  // ---- Unpublish → gone from /invest ----
  page.once("dialog", (d) => void d.accept()); // (no unsaved-changes prompt expected, but safe)
  await ed2.getByRole("button", { name: "Unpublish" }).click();
  await toast(page, /Unpublished/);
  await pub.goto("/invest");
  await expect(plansRegion(pub).locator("article", { hasText: name })).toHaveCount(0);

  // ---- Delete: the dialog says how many enquiries mention it ----
  await page.getByRole("button", { name: "Delete plan" }).click();
  const dialog = page.getByRole("dialog", { name: `Delete “${name}”?` });
  await expect(dialog).toContainText("No enquiries mention this plan.");
  await dialog.getByRole("button", { name: "Delete plan" }).click();
  await toast(page, /Deleted/);
  await expect(page).toHaveURL(/\/admin\/plans$/);
  expect(await planByName(name)).toBeNull();
  await pub.close();
}

async function faqFlow(page: Page) {
  const token = randomUUID().slice(0, 8);
  const q = `[SAMPLE] E2E FAQ ${token}?`;
  const group = page.locator('[data-faq-page="INVEST"]');
  const faqOnSite = (p: Page) =>
    p.getByRole("region", { name: /Before you invest/ }).locator("details");

  await page.goto("/admin/faqs");
  await expect(page.getByRole("heading", { level: 1, name: "FAQs" })).toBeVisible();

  // guarantee check on add
  await group.getByRole("button", { name: /Add an FAQ/ }).click();
  await group.getByLabel("Question").fill(q);
  await group.getByLabel("Answer").fill("Returns are guaranteed.");
  await group.getByRole("button", { name: "Add FAQ" }).click();
  await expect(group.getByText(/Please don't use “guarantee”/)).toBeVisible();
  await expect(group.getByLabel("Answer")).toBeFocused();

  await group.getByLabel("Answer").fill("Line one of the answer.\nLine two, kept on its own line.");
  await group.getByRole("button", { name: "Add FAQ" }).click();
  await toast(page, /FAQ added/);
  const row = group.locator("tbody tr", { hasText: q });
  await expect(row).toContainText("Draft");

  const pub = await page.context().newPage();
  await pub.goto("/invest");
  await expect(faqOnSite(pub).filter({ hasText: q })).toHaveCount(0);

  // publish → shows on /invest, line break kept
  await row.getByRole("button", { name: `Publish “${q}”` }).click();
  await toast(page, /Published/);
  await pub.goto("/invest");
  const item = faqOnSite(pub).filter({ hasText: q });
  await expect(item).toHaveCount(1);
  await item.locator("summary").click();
  const answer = item.locator("p").first();
  await expect(answer).toHaveCSS("white-space", "pre-line");
  expect(await answer.textContent()).toBe(
    "Line one of the answer.\nLine two, kept on its own line.",
  );

  // edit
  const q2 = `[SAMPLE] E2E FAQ ${token} edited?`;
  await group
    .locator("tbody tr", { hasText: q })
    .getByRole("button", { name: `Edit “${q}”` })
    .click();
  await group.getByLabel("Question").fill(q2);
  await group.getByRole("button", { name: "Save", exact: true }).click();
  await toast(page, /FAQ saved/);
  await pub.goto("/invest");
  await expect(faqOnSite(pub).filter({ hasText: q2 })).toHaveCount(1);

  // reorder ↑ → /invest order changes
  const titles = () =>
    faqOnSite(pub)
      .locator("summary")
      .evaluateAll((s) => s.map((x) => x.textContent?.trim() ?? ""));
  const at = (await titles()).indexOf(q2);
  expect(at).toBeGreaterThan(0);
  await group
    .locator("tbody tr", { hasText: q2 })
    .getByRole("button", { name: `Move “${q2}” up` })
    .click();
  await toast(page, /Order saved/);
  await expect(async () => {
    await pub.goto("/invest");
    expect((await titles()).indexOf(q2)).toBe(at - 1);
  }).toPass({ timeout: 20_000 });

  // delete
  await group
    .locator("tbody tr", { hasText: q2 })
    .getByRole("button", { name: `Delete ${q2}` })
    .click();
  const dialog = page.getByRole("dialog", { name: `Delete “${q2}”?` });
  await dialog.getByRole("button", { name: "Delete FAQ" }).click();
  await toast(page, /FAQ deleted/);
  await expect(group.locator("tbody tr", { hasText: q2 })).toHaveCount(0);
  await pub.goto("/invest");
  await expect(faqOnSite(pub).filter({ hasText: q2 })).toHaveCount(0);
  await pub.close();
}

async function listsRender(page: Page) {
  await page.goto("/admin/plans");
  await expect(page.getByRole("heading", { level: 1, name: "Investment plans" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Investment plans" }).locator("tbody tr"),
  ).not.toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add plan" })).toHaveAttribute(
    "href",
    "/admin/plans/new",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  await page.goto("/admin/faqs");
  await expect(page.locator('[data-faq-page="INVEST"]')).toBeVisible();
  await expect(page.locator('[data-faq-page="GENERAL"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  // Sidebar: Investment plans → /admin/plans, FAQs under it.
  if (page.viewportSize()!.width <= 860)
    await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", { name: "Admin" });
  await expect(nav.getByRole("link", { name: "Investment plans" })).toHaveAttribute(
    "href",
    "/admin/plans",
  );
  await expect(nav.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "/admin/faqs");
}

test.describe("viewer", () => {
  test.use({ storageState: storageStateFor("viewer") });
  for (const path of ["/admin/plans", "/admin/plans/new", "/admin/faqs"]) {
    test(`403 at ${path}`, async ({ page }) => {
      expect((await page.goto(path))?.status()).toBe(403);
      await expect(page.getByRole("heading", { level: 1, name: "No admin access" })).toBeVisible();
    });
  }
});
