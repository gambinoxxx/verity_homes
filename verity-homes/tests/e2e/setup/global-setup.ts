// Runs once in the main Playwright process, before any worker starts: fetches a Clerk testing
// token (bypasses bot protection on the development instance) into process.env, which every
// worker inherits. Reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY from .env.test.
import { clerkSetup } from "@clerk/testing/playwright";

export default async function globalSetup() {
  await clerkSetup();
}
