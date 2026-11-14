// Home page behaviour (Unit 4). Runs on desktop (1440) and mobile (390) with seeded [SAMPLE] data.
import { getPlanRows } from "./helpers/db";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("home search bar", () => {
  test("budget ranges follow the tab and are sent as min/max in naira", async ({ page }) => {
    await page.goto("/");
    const budget = page.getByLabel("Budget");
    await expect(budget.locator("option")).toHaveText([
      "Any budget",
      "Under ₦50M",
      "₦50M – ₦150M",
      "₦150M – ₦300M",
      "₦300M – ₦500M",
      "Above ₦500M",
    ]);
    await budget.selectOption({ label: "₦50M – ₦150M" });

    // Switching tab swaps the ranges and clears the choice.
    await page.getByRole("tab", { name: "Rent" }).click();
    await expect(budget).toHaveValue("");
    await expect(budget.locator("option").nth(1)).toHaveText("Under ₦3M");
    await budget.selectOption({ label: "Above ₦20M" });
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/properties\?type=rent&min=20000000$/);
  });

  test("land ranges send both bounds; invest has no budget", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Land" }).click();
    await page.getByLabel("Budget").selectOption({ label: "₦10M – ₦30M" });
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/properties\?type=land&min=10000000&max=30000000$/);

    await page.goto("/");
    await page.getByRole("tab", { name: "Invest" }).click();
    await expect(page.getByLabel("Budget")).toBeDisabled();
  });
});

test("signature projects show the seeded showcase listings with status pills", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: /Developments we're proud of/ });
  await expect(section).toBeVisible();
  // 3 seeded showcase properties → 3 stacked cards.
  await expect(section.locator("img")).toHaveCount(3);
  if (test.info().project.name === "desktop") {
    await expect(section.getByText("Selling now")).toBeVisible();
    // One panel item per project; all but the active one are inert (not focusable while hidden).
    await expect(section.getByRole("link", { name: "Enquire about this" })).toHaveCount(3);
    await expect(section.locator("[inert]")).toHaveCount(2);
  }
});

test("invest section shows summary plan cards and the disclaimer", async ({ page }) => {
  const section = page.locator("#invest");
  // Plans are site-wide; the admin plans test (Unit 17) may publish one meanwhile.
  await expect(async () => {
    await page.goto("/");
    const published = (await getPlanRows()).filter((p) => p.status === "PUBLISHED").length;
    await expect(section.locator("article")).toHaveCount(published, { timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
  await expect(section.getByText("₦1,000,000")).toBeVisible();
  await expect(section.getByText("Invest from").first()).toBeVisible();
  await expect(section.getByRole("link", { name: /View plan/ }).first()).toHaveAttribute(
    "href",
    /^\/invest\/[a-z0-9-]+$/,
  );
  await expect(section.locator("article").first()).not.toContainText(/%/);
  await expect(section.getByText(/Investment returns are subject to the terms/)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/guarantee/i);
});

test("services accordion opens one item and swaps the caption; /#services lands here", async ({
  page,
}) => {
  await page.goto("/#services");
  const section = page.locator("#services");
  await expect(section).toBeInViewport();
  const land = section.getByRole("button", { name: /Land/ });
  await land.click();
  await expect(land).toHaveAttribute("aria-expanded", "true");
  await expect(section.getByRole("button", { name: /Property sales/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(section.locator("[aria-live]")).toHaveText("Land");
});

test("testimonials and latest posts render from the database", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Clients who trusted Verity" })).toBeVisible();
  const blog = page.locator("#blog");
  await expect(blog.locator('a[href^="/blog/"]')).toHaveCount(3);
});

test("the enquiry form is live: submit enabled, no 'goes live soon' note", async ({ page }) => {
  await page.goto("/#contact");
  const form = page.locator("#enquiry");
  await expect(form.getByRole("button", { name: /Send enquiry/ })).toBeEnabled();
  await expect(page.getByText("Form goes live soon", { exact: false })).toHaveCount(0);
  await expect(form.getByRole("radio", { name: "Investing" })).toBeChecked();
});

test.describe("with motion on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("statement words fill on scroll and are all filled by mid-viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // preloader releases the scroll lock
    const para = page.locator('section[aria-label="Our promise"] p');
    const words = para.locator('[aria-hidden="true"] > span > span');
    expect(await words.count()).toBe(20);
    const filled = () =>
      words.evaluateAll((els) => els.filter((e) => /(^|_)on(\s|$)/.test(e.className)).length);

    // Paragraph top just inside the bottom of the viewport: not started yet.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight * 0.95);
    });
    await expect.poll(filled).toBe(0);

    // Part-way: top at 75% of the viewport.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top - window.innerHeight * 0.75);
    });
    await expect.poll(filled).toBeGreaterThan(0);
    expect(await filled()).toBeLessThan(20);

    // Owner condition (Open question 21): fully filled once its centre is mid-viewport.
    await para.evaluate((el) => {
      const r = el.getBoundingClientRect();
      window.scrollBy(0, r.top + r.height / 2 - window.innerHeight / 2);
    });
    await expect.poll(filled).toBe(20);
  });

  test("no serious accessibility violations with animations running", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // preloader
    // The statement's not-yet-filled words are the design's light grey on purpose (the fill
    // effect; Open question 21). They are aria-hidden and the sentence is read once from an
    // sr-only copy, so only those animated words are excluded here. public.spec.ts runs with
    // reduced motion, where every word is filled, and checks the whole page.
    const statement = page.locator('section[aria-label="Our promise"]');
    await expect(statement.locator(".sr-only")).toHaveText(/held to one standard: the truth\./);
    const results = await new AxeBuilder({ page })
      .exclude("iframe")
      .exclude('section[aria-label="Our promise"] p > [aria-hidden="true"]')
      .analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
      [],
    );
  });
});

// ---- Intro photos (bug fix 2026-11-12) -------------------------------------------------
// The photos are `.reveal-img`: clipped with `clip-path: inset(0 0 100% 0)` until revealed.
// Playwright's boundingBox()/toBeVisible() ignore clip-path, so these checks also assert that
// the computed clip no longer hides the photo — otherwise they would pass with the bug.

async function expectIntroPhotosShown(page: import("@playwright/test").Page) {
  const intro = page.locator("#about");
  await intro.scrollIntoViewIfNeeded();
  const boxes = intro.locator(".reveal-img");
  await expect(boxes).toHaveCount(2);
  for (const box of await boxes.all()) {
    const bb = await box.boundingBox();
    expect(bb?.width ?? 0).toBeGreaterThan(0);
    expect(bb?.height ?? 0).toBeGreaterThan(0);
    // Loaded…
    await expect
      .poll(() => box.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    // …and not clipped away (the reveal wipe ends at inset(0) / none).
    await expect
      .poll(() => box.evaluate((el) => getComputedStyle(el).clipPath))
      .not.toContain("100%");
  }
}

test.describe("intro photos, animations on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("both photos show after scrolling to the intro", async ({ page }) => {
    await page.goto("/");
    // The preloader covers the page for up to 5s on a full load.
    await expect(page.locator('[role="status"][aria-label^="Loading Verity"]')).toHaveCount(0, {
      timeout: 7000,
    });
    await expectIntroPhotosShown(page);
  });
});

test.describe("intro photos after a scroll jump", () => {
  test.use({ reducedMotion: "no-preference" });

  // A reload mid-page or a fast fling can land past the photos' top edge in one step.
  test("photos still show when the page jumps past their top edge", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[role="status"][aria-label^="Loading Verity"]')).toHaveCount(0, {
      timeout: 7000,
    });
    // Jump so the tall arched photo's top edge is 100px above the screen.
    await page.evaluate(() => {
      const photo = document.querySelector("#about .reveal-img")!;
      window.scrollTo(0, window.scrollY + photo.getBoundingClientRect().top + 100);
    });
    const photo = page.locator("#about .reveal-img").first();
    await expect
      .poll(() => photo.evaluate((el) => getComputedStyle(el).clipPath))
      .not.toContain("100%");
  });
});

test.describe("intro photos, reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("both photos show without any animation", async ({ page }) => {
    await page.goto("/");
    await expectIntroPhotosShown(page);
  });
});

test.describe("reveal content without the app's JavaScript", () => {
  // Animations on: under reduced motion nothing is hidden anyway.
  test.use({ reducedMotion: "no-preference" });

  test("nothing stays hidden if the Next.js bundles fail to load", async ({ page }) => {
    // Inline scripts still run, but the app bundles never arrive (blocked here), as on a flaky
    // network or a broken deploy. No reveal content may be left hidden.
    let blocked = 0;
    await page.route(/\/_next\/static\/chunks\/.+\.js(\?|$)/, (route) => {
      blocked++;
      return route.abort();
    });
    await page.goto("/");
    await page.waitForTimeout(500);
    expect(blocked, "no bundles were blocked: the test would prove nothing").toBeGreaterThan(0);
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll(".reveal, .reveal-img")].filter((el) => {
          const cs = getComputedStyle(el);
          return cs.opacity === "0" || cs.clipPath.includes("100%");
        }).length,
    );
    expect(hidden, "reveal elements left hidden").toBe(0);
  });
});

test("services titles stay aligned when one is active", async ({ page }) => {
  await page.goto("/");
  const buttons = page.locator("#services h3 button");
  await expect(buttons).toHaveCount(5);
  for (const i of [2, 4]) {
    await buttons.nth(i).click();
    await expect(buttons.nth(i)).toHaveAttribute("aria-expanded", "true");
    const lefts = await buttons.evaluateAll((els) =>
      els.map((b) =>
        Math.round(b.querySelector("span:nth-child(2)")!.getBoundingClientRect().left),
      ),
    );
    expect(new Set(lefts).size, `title x positions: ${lefts.join(", ")}`).toBe(1);
  }
});

// ---- Services tap bug (2026-11-12) ------------------------------------------------------
// Tapping an item used to blank it: React re-rendered its className (active toggled) and
// wiped the "in" class a scroll observer had added by hand, so it fell back to opacity 0.
// Animations must be ON here: under reduced motion CSS shows every .reveal anyway, which
// would hide the bug. Opacity is checked including ancestors (the item wrapper faded out).

const SERVICE_TITLES = [
  "Property sales",
  "Rentals",
  "Land",
  "Property management",
  "Development",
] as const;

/** Opacity as rendered: the element's own times every ancestor's. */
function effectiveOpacity(el: Element): number {
  let o = 1;
  for (let n: Element | null = el; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
  return o;
}

test.describe("services accordion, animations on", () => {
  test.use({ reducedMotion: "no-preference" });

  test("tapping each service keeps every title visible and opens its description", async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.locator('[role="status"][aria-label^="Loading Verity"]')).toHaveCount(0, {
      timeout: 7000,
    });
    const section = page.locator("#services");
    const buttons = section.locator("h3 button");
    await expect(buttons).toHaveCount(5);
    // Scroll through the list so every item has been revealed before tapping.
    await buttons.last().scrollIntoViewIfNeeded();
    await section.scrollIntoViewIfNeeded();

    for (const [i, title] of SERVICE_TITLES.entries()) {
      const button = buttons.nth(i);
      await button.scrollIntoViewIfNeeded();
      if (info.project.name === "mobile") await button.tap();
      else await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");

      // The tapped item: title and description fully visible, with a real size.
      const panel = section.locator(`#${await button.getAttribute("aria-controls")}`);
      for (const el of [button, panel.locator("p")]) {
        await expect.poll(() => el.evaluate(effectiveOpacity), { timeout: 3000 }).toBe(1);
        const bb = await el.boundingBox();
        expect(bb?.width ?? 0).toBeGreaterThan(0);
        expect(bb?.height ?? 0).toBeGreaterThan(0);
      }
      // The caption over the photo names it.
      await expect(section.locator("[class*=cap] b")).toHaveText(title);
      // The other four titles stay visible too.
      for (const [k, other] of SERVICE_TITLES.entries()) {
        if (k === i) continue;
        expect(
          await buttons.nth(k).evaluate(effectiveOpacity),
          `"${other}" faded after tapping "${title}"`,
        ).toBe(1);
      }
    }
  });
});
