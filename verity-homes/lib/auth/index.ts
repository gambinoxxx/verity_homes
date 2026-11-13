// Admin access for pages, server actions and route handlers. The only server-side Clerk user
// (with lib/auth/proxy.ts). Every admin page, action and route calls requireAdmin() — proxy.ts
// alone is never treated as enough (context/architecture.md).
//
// Cache Components: auth() is request-time data, so callers in Server Components must sit inside
// <Suspense> (app/admin/(panel)/layout.tsx does this once for every admin page).
import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { clerkEnv } from "@/lib/env";
import { SIGN_IN_PATH, isAdminRole, roleFromClaims } from "./roles";

export { NO_ACCESS_PATH, SIGN_IN_PATH } from "./roles";

/** Thrown by requireAdmin() for a signed-in user without the admin role (HTTP 403). */
export class ForbiddenError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: admin role required");
    this.name = "ForbiddenError";
  }
}

export type AdminUser = { userId: string; firstName: string | null; imageUrl: string | null };

type AccessStatus =
  { kind: "signed-out" } | { kind: "forbidden" } | { kind: "admin"; userId: string };

// Once per request: the layout, the page and each admin query all call requireAdmin().
const accessStatus = cache(async (): Promise<AccessStatus> => {
  // Admin data is always request-time: never let a prerender reach the queries after this.
  await connection();
  clerkEnv(); // clear error naming the missing Clerk variables, never their values
  const { userId, sessionClaims } = await auth();
  if (!userId) return { kind: "signed-out" };
  const fromClaims = roleFromClaims(sessionClaims);
  const role = fromClaims.known ? fromClaims.role : (await currentUser())?.publicMetadata.role;
  return isAdminRole(role) ? { kind: "admin", userId } : { kind: "forbidden" };
});

/**
 * Signed out → redirect to /admin/sign-in. Signed in without publicMetadata.role "admin" →
 * throws ForbiddenError (403). Returns the admin's user id.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const status = await accessStatus();
  if (status.kind === "signed-out") redirect(SIGN_IN_PATH);
  if (status.kind === "forbidden") throw new ForbiddenError();
  return { userId: status.userId };
}

/** "admin" | "forbidden" | "signed-out", for API routes that answer 401/403 themselves. */
export async function adminAccess(): Promise<AccessStatus["kind"]> {
  return (await accessStatus()).kind;
}

/** True only for a signed-in admin. Never redirects or throws. */
export async function isAdmin(): Promise<boolean> {
  return (await accessStatus()).kind === "admin";
}

/** Name and avatar for the admin shell's greeting. Call after requireAdmin(). */
export async function getAdminUser(): Promise<AdminUser | null> {
  const user = await currentUser();
  if (!user) return null;
  return { userId: user.id, firstName: user.firstName, imageUrl: user.imageUrl };
}
