import { test, expect, type Page } from "@playwright/test";
import { PRIVACY_REVIEWED } from "../../lib/privacy";
import { dashboardCounts, latestEnquiryIds, setupFacts } from "./helpers/db";
import { signInAs, storageStateFor } from "./setup/clerk-users";

// Admin protection (Units 12+). Runs in the admin-desktop / admin-mobile projects; the signed-in
// parts use the Clerk test users signed in by setup/auth.setup.ts (TESTING.md §6).
// Later units' signed-in flows: see the commented block at the end.

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) <= 860;

// Signed-out protection — runs without any Clerk setup.
for (const path of ["/admin", "/admin/properties", "/admin/enquiries", "/admin/properties/new"]) {
  test(`signed-out visitor to ${path} is sent to sign-in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });
}

test("admin pages are not indexable", async ({ page }) => {
  await page.goto("/admin/sign-in");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

// Unit 12: the sign-in page shows Clerk's form (needs real Clerk dev keys in .env.test).
test("sign-in page shows the Clerk sign-in form on navy", async ({ page }) => {
  const res = await page.goto("/admin/sign-in");
  expect(res?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to Verity admin" }),
  ).toBeAttached();
  // Clerk's identifier field (email or username, depending on the instance settings).
  await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
});

test("signed-out redirect keeps where the visitor was going", async ({ request }) => {
  const res = await request.get("/admin/properties", { maxRedirects: 0 });
  expect([307, 302, 303]).toContain(res.status());
  const location = res.headers().location ?? "";
  // Straight to sign-in, or through Clerk's dev-instance handshake first.
  expect(location).toMatch(/\/admin\/sign-in|clerk\.accounts\.dev/);
});

// Public pages never load Clerk (context/architecture.md: "Public pages never call Clerk").
for (const path of ["/", "/properties", "/blog", "/contact"]) {
  test(`public page ${path} makes no requests to Clerk`, async ({ page }) => {
    const clerkRequests: string[] = [];
    page.on("request", (r) => {
      if (/clerk/i.test(new URL(r.url()).hostname)) clerkRequests.push(r.url());
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(clerkRequests).toEqual([]);
    const cookies = await page.context().cookies();
    expect(cookies.filter((c) => /clerk|__session|__client/i.test(c.name))).toEqual([]);
  });
}

// ---- Signed in as the admin test user (Unit 12 shell; Q43) ----
test.describe("signed-in admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("sees the dashboard, sidebar and topbar", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/^Good (morning|afternoon|evening)/)).toBeVisible();
    await expect(page.locator(".cl-userButtonTrigger")).toBeVisible({ timeout: 20_000 });

    const sidebar = page.getByRole("complementary", { name: "Admin navigation" });
    const links = sidebar.getByRole("navigation", { name: "Admin" }).getByRole("link");
    if (isMobile(page)) {
      await page.getByRole("button", { name: "Open navigation" }).click();
    }
    await expect(links).toHaveText([
      "Dashboard",
      "Properties",
      "Investment plans",
      "Blog posts",
      "Testimonials",
      "Partners",
      /^Enquiries(\d+ new)?$/, // + the NEW-count badge
      "Site settings",
    ]);
    await expect(links.first()).toHaveAttribute("aria-current", "page");
    await expect(sidebar.getByRole("link", { name: "View site" })).toBeVisible();
  });

  test("desktop: the sidebar is always shown and there is no menu button", async ({ page }) => {
    test.skip(isMobile(page), "desktop only");
    await page.goto("/admin");
    await expect(page.locator("#admin-sidebar")).toBeInViewport();
    await expect(page.locator("#admin-menu-toggle")).toBeHidden();
  });

  test("mobile: the menu drawer opens and closes (Esc, tap outside)", async ({ page }) => {
    test.skip(!isMobile(page), "mobile only");
    await page.goto("/admin");
    const sidebar = page.locator("#admin-sidebar");
    const toggle = page.locator("#admin-menu-toggle");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(sidebar).not.toBeInViewport();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Open → focus moves into the drawer; Esc closes and returns focus to the button.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).toBeInViewport();
    await expect(sidebar.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar).not.toBeInViewport();
    await expect(toggle).toBeFocused();

    // Open → tap the backdrop to the right of the 260px drawer.
    await toggle.click();
    await expect(sidebar).toBeInViewport();
    await page.mouse.click(340, 500);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebar).not.toBeInViewport();
  });
});

// ---- Unit 13: dashboard (live numbers from the TEST database) ----
// Other workers may add enquiries while these run, so each check re-reads the page and the DB
// together until they agree (toPass). Nothing here writes to or wipes shared test data.
test.describe("admin dashboard", () => {
  test.use({ storageState: storageStateFor("admin") });

  const statValue = (page: Page, key: string) =>
    page.locator(`[data-stat="${key}"] b`).innerText().then(Number);

  test("stats match the database, each card links to its list", async ({ page }) => {
    await expect(async () => {
      await page.goto("/admin");
      const shown = {
        newEnquiries: await statValue(page, "new-enquiries"),
        published: await statValue(page, "published"),
        drafts: await statValue(page, "drafts"),
        plans: await statValue(page, "plans"),
      };
      const db = await dashboardCounts();
      expect(shown).toEqual({
        newEnquiries: db.newEnquiries,
        published: db.published,
        drafts: db.drafts,
        plans: db.plans,
      });
      await expect(page.locator('[data-stat="published"] span')).toHaveText(
        `${db.featured} featured on the home page`,
      );
    }).toPass({ timeout: 45_000 });

    await expect(page.locator('[data-stat="plans"] span')).toHaveText("Live on /invest");
    for (const [key, href] of [
      ["new-enquiries", "/admin/enquiries"],
      ["published", "/admin/properties"],
      ["drafts", "/admin/properties"],
      ["plans", "/admin/plans"],
    ] as const) {
      await expect(page.locator(`[data-stat="${key}"]`)).toHaveAttribute("href", href);
    }
    // The design's "Sample data" alert is not built.
    await expect(page.getByText(/Sample data — every number/)).toHaveCount(0);
  });

  test("latest enquiries: newest 5 first, each links to the inbox", async ({ page }) => {
    const panel = page.getByRole("region", { name: "Latest enquiries" });
    await expect(async () => {
      await page.goto("/admin");
      const ids = await latestEnquiryIds(5);
      const hrefs = await panel
        .getByRole("listitem")
        .getByRole("link")
        .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
      expect(hrefs).toEqual(ids.map((id) => `/admin/enquiries?id=${id}`));
    }).toPass({ timeout: 45_000 });
    const first = panel.getByRole("listitem").first();
    if (await first.count()) {
      await expect(first.locator("time")).toHaveText(/ago|Just now|Yesterday|\d{4}/);
      await expect(first.getByText(/^(New|Contacted|Closed)$/)).toBeVisible();
    } else {
      await expect(panel).toContainText("No enquiries yet");
    }
  });

  test("sidebar badge shows the NEW enquiry count", async ({ page }) => {
    await expect(async () => {
      await page.goto("/admin");
      const { newEnquiries } = await dashboardCounts();
      const badge = page.getByTestId("new-enquiries-badge");
      if (newEnquiries === 0) await expect(badge).toHaveCount(0);
      else expect(await badge.textContent()).toBe(`${newEnquiries} new`);
    }).toPass({ timeout: 45_000 });
  });

  test("setup checklist lists exactly what the data says is missing", async ({ page }) => {
    await page.goto("/admin");
    const facts = await setupFacts();
    const expected = [
      !facts.whatsappSet && "whatsapp",
      !facts.emailSet && "email",
      facts.realPublished < 1 && "property",
      !PRIVACY_REVIEWED && "privacy",
    ].filter(Boolean);
    const card = page.getByTestId("setup-checklist");
    if (!expected.length) {
      await expect(card).toHaveCount(0);
      return;
    }
    await expect(card.locator("[data-item]")).toHaveCount(expected.length);
    expect(
      await card
        .locator("[data-item]")
        .evaluateAll((els) => els.map((e) => e.getAttribute("data-item"))),
    ).toEqual(expected);
    if (expected.includes("privacy")) {
      await expect(card.locator('[data-item="privacy"] a')).toHaveAttribute("href", "/privacy");
    }
  });

  test("quick actions and Add property say 'Coming soon' until their pages exist", async ({
    page,
  }) => {
    await page.goto("/admin");
    const quick = page.getByRole("region", { name: "Quick actions" });
    for (const label of [
      "Add a property",
      "Write a blog post",
      "Edit investment plans",
      "Update contact details",
    ]) {
      const item = quick.getByText(label);
      await expect(item).toBeVisible();
      await expect(item).toContainText("Coming soon");
    }
    const add = page.locator("header").getByText("Add property");
    await expect(add).toBeAttached();
    await expect(page.locator('header [aria-disabled="true"]')).toHaveAttribute(
      "data-href",
      "/admin/properties/new",
    );
  });

  test("the top bar greeting stays on one line", async ({ page }) => {
    await page.goto("/admin");
    const crumb = page.getByText(/^Good (morning|afternoon|evening)/);
    const box = await crumb.boundingBox();
    expect(box?.height ?? 0).toBeLessThan(24); // one 13px line
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(page.viewportSize()!.width);
  });
});

// ---- Signed in as the viewer test user (no admin role) ----
test.describe("signed-in non-admin", () => {
  test.use({ storageState: storageStateFor("viewer") });

  for (const path of ["/admin", "/admin/enquiries"]) {
    test(`gets 403 "No admin access" at ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(403);
      await expect(page.getByRole("heading", { level: 1, name: "No admin access" })).toBeVisible();
      await expect(page.locator("#admin-sidebar")).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
    });
  }
});

// Signs in fresh (not the shared saved state): signing out ends that session for everyone.
test("non-admin can sign out from the 403 page", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/admin/sign-in");
  await signInAs(page, "viewer");
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(403);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/sign-in/);
  await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 });
  // Signed out for real: /admin is a redirect to sign-in again.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/sign-in/);
  await context.close();
});

/* Later units' signed-in flows (Units 14+): enable when those pages exist.
test.describe("signed-in admin: content", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("create a draft property, publish it, see it on the site", async ({ page }) => {
    await page.goto("/admin/properties/new");
    await page.getByLabel("Title").fill("[SAMPLE] E2E Test Home");
    await page.getByLabel("Area").fill("Yaba");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();
    // draft must NOT be public
    const draft = await page.request.get("/properties/sample-e2e-test-home");
    expect(draft.status()).toBe(404);
    await page.getByRole("button", { name: "Publish" }).click();
    await page.goto("/properties/sample-e2e-test-home");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/E2E Test Home/);
  });

  test("enquiry can be marked contacted", async ({ page }) => {
    await page.goto("/admin/enquiries");
    await page.getByRole("row").nth(1).click();
    await page.getByRole("button", { name: "Mark contacted" }).click();
    await expect(page.getByText("Contacted").first()).toBeVisible();
  });
});
*/
