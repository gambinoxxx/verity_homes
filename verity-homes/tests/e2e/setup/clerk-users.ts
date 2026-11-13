// Clerk test users (development instance, TESTING.md §6). Credentials come from .env.test.
import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";

export type ClerkTestUser = "admin" | "viewer";

const ENV: Record<ClerkTestUser, [string, string]> = {
  admin: ["E2E_CLERK_USER_USERNAME", "E2E_CLERK_USER_PASSWORD"],
  viewer: ["E2E_CLERK_VIEWER_USERNAME", "E2E_CLERK_VIEWER_PASSWORD"],
};

function credentials(user: ClerkTestUser) {
  const [idVar, pwVar] = ENV[user];
  const identifier = process.env[idVar];
  const password = process.env[pwVar];
  if (!identifier || !password) {
    throw new Error(`Signed-in e2e tests need ${idVar} and ${pwVar} in .env.test (TESTING.md §6).`);
  }
  return { identifier, password };
}

/**
 * Signs a test user in on a page that has loaded Clerk (/admin/sign-in). Uses @clerk/testing's
 * sign-in-token ("ticket") flow, made with CLERK_SECRET_KEY: a password sign-in from a new
 * browser stops at Clerk's Client Trust email check ("needs_client_trust"), which a test can't
 * pass. The password is still required in .env.test so the account can be used by hand.
 */
export async function signInAs(page: Page, user: ClerkTestUser) {
  // Wait for Clerk to finish loading first: signing in while the page is still settling can
  // fail with "Resulting promise was garbage collected".
  await clerk.loaded({ page });
  await clerk.signIn({ page, emailAddress: credentials(user).identifier });
}

/** Saved browser state (cookies + storage) of a signed-in user; git-ignored. */
export const storageStateFor = (user: ClerkTestUser) =>
  path.resolve("playwright/.auth", `${user}.json`);
