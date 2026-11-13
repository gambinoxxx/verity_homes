// Signs each Clerk test user in once and saves the browser state for the signed-in tests
// (test.use({ storageState })). Sign-in needs a page that loads Clerk: /admin/sign-in.
import { expect, test as setup } from "@playwright/test";
import { type ClerkTestUser, signInAs, storageStateFor } from "./clerk-users";

for (const user of ["admin", "viewer"] as ClerkTestUser[]) {
  setup(`sign in the ${user} test user`, async ({ page }) => {
    await page.goto("/admin/sign-in");
    await signInAs(page, user);
    // The proxy decides by role: admin → dashboard (200), viewer → no-access (403). Check the
    // page too: a failed sign-in lands on the sign-in page, which is also a 200.
    const res = await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    if (user === "admin") {
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    } else {
      expect(res?.status()).toBe(403);
      await expect(page.getByRole("heading", { level: 1, name: "No admin access" })).toBeVisible();
    }
    await page.context().storageState({ path: storageStateFor(user) });
  });
}
