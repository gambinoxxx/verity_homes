// Admin editor forms (React Hook Form) for e2e. Text typed into a field before the page has
// hydrated is reset when React Hook Form registers that field, so a test that types right after
// goto()/reload() can save stale values (flaky under load). The editors set data-ready="true"
// once hydrated (useHydrated); this locator only matches then, and Playwright re-resolves it on
// every action — so each fill/click through it waits for hydration, never for a fixed time.
import { expect, type Locator, type Page } from "@playwright/test";

export type EditorName =
  | "Property editor"
  | "Plan editor"
  | "Post editor"
  | "Site settings"
  | "Testimonial editor"
  | "Partner editor";

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

/**
 * Saves an editor and waits until its data-version changed (the save's updatedAt). Since Unit
 * 20b the property, plan and post editors are reset in place after a save instead of remounted
 * (Q57), so acting earlier is safe; tests still wait so their next step sees the saved state.
 */
export async function saveAndWaitForRemount(
  page: Page,
  form: Locator,
  button: Locator,
): Promise<void> {
  const before = await form.getAttribute("data-version");
  await clickAndWaitForAction(page, button);
  if (before) await expect(form).not.toHaveAttribute("data-version", before);
}

/**
 * After the first save on /new the app router.replace()s to /<id>: the URL changes before the
 * new editor renders, so the /new editor can still be on screen. Wait for the editor of the
 * saved record (only it has a data-version) before acting.
 */
export async function expectSavedEditor(form: Locator): Promise<void> {
  await expect(form).toHaveAttribute("data-version", /\S/);
}
