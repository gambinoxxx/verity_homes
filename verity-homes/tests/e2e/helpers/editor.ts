// Admin editor forms (React Hook Form) for e2e. Text typed into a field before the page has
// hydrated is reset when React Hook Form registers that field, so a test that types right after
// goto()/reload() can save stale values (flaky under load). The editors set data-ready="true"
// once hydrated (useHydrated); this locator only matches then, and Playwright re-resolves it on
// every action — so each fill/click through it waits for hydration, never for a fixed time.
import type { Locator, Page } from "@playwright/test";

export type EditorName = "Property editor" | "Plan editor" | "Post editor" | "Site settings";

export function readyForm(page: Page, name: EditorName) {
  return page.getByRole("form", { name }).and(page.locator('[data-ready="true"]'));
}

/**
 * Clicks and waits for the server action that click starts (requests carry a Next-Action
 * header) to answer. Use it when the same toast text can appear twice in a row ("Changes
 * saved"): a toast from the previous save may still be on screen, so the toast alone doesn't
 * prove THIS save finished.
 */
export async function clickAndWaitForAction(page: Page, target: Locator): Promise<void> {
  const done = page.waitForResponse(
    (r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]),
  );
  await target.click();
  const res = await done;
  if (!res.ok()) throw new Error(`server action answered ${res.status()}`);
}
