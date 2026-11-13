// Pure role helpers (no Clerk import), shared by proxy.ts and requireAdmin(). Unit-tested.
//
// The admin role lives in Clerk `publicMetadata.role === "admin"`. When the Clerk session token
// is customised with { "metadata": "{{user.public_metadata}}" } (Dashboard → Sessions), the role
// is in the session claims and needs no network call. Without that customisation the claim is
// absent, and callers fall back to reading the user from Clerk's Backend API.

export const ADMIN_ROLE = "admin";
export const SIGN_IN_PATH = "/admin/sign-in";
export const NO_ACCESS_PATH = "/admin/no-access";

export type RoleFromClaims =
  | { known: true; role: string | null }
  /** The session token has no `metadata` claim: look the user up instead. */
  | { known: false };

/** Reads `metadata.role` from session claims, telling "no role" apart from "claim not set up". */
export function roleFromClaims(claims: unknown): RoleFromClaims {
  if (!claims || typeof claims !== "object" || !("metadata" in claims)) return { known: false };
  const metadata = (claims as { metadata: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") return { known: true, role: null };
  const role = (metadata as { role?: unknown }).role;
  return { known: true, role: typeof role === "string" ? role : null };
}

export function isAdminRole(role: unknown): boolean {
  return role === ADMIN_ROLE;
}

/** Admin pages that stay reachable without the admin role (or signed out). */
export function isPublicAdminPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname.startsWith(`${SIGN_IN_PATH}/`) ||
    pathname === NO_ACCESS_PATH
  );
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
