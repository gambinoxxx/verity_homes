// Runs once in the main Playwright process, before any worker starts: fetches a Clerk testing
// token (bypasses bot protection on the development instance) into process.env, which every
// worker inherits. Reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY from .env.test.
//
// With the .env.example placeholder key (e.g. a fresh Codespace) there is no token to fetch:
// public specs still run, and signed-in admin specs fail at sign-in with Clerk's own error.
import { clerkSetup } from "@clerk/testing/playwright";

const isPlaceholder = (key: string | undefined) => !key || key.endsWith("...") || key.length < 20;

export default async function globalSetup() {
  if (isPlaceholder(process.env.CLERK_SECRET_KEY)) {
    console.warn(
      "[global-setup] CLERK_SECRET_KEY in .env.test is a placeholder: skipping the Clerk testing token. " +
        "Public specs run; signed-in admin specs need real Clerk development keys (TESTING.md §6).",
    );
    return;
  }
  await clerkSetup();
}
