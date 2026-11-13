// /admin/* in proxy.ts: answers with the real status before any admin page renders (with Cache
// Components a page streams a 200 shell first, so it can't redirect or 403 with a real status).
// - /admin/sign-in(…) and /admin/no-access: always reachable
// - signed out → 307 to /admin/sign-in?redirect_url=…
// - signed in without the admin role → 403 with the /admin/no-access page (see noAccess below)
// Pages, actions and routes still call requireAdmin() themselves.
import { clerkClient, clerkMiddleware } from "@clerk/nextjs/server";
import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { clerkEnv } from "@/lib/env";
import {
  NO_ACCESS_PATH,
  SIGN_IN_PATH,
  isAdminRole,
  isPublicAdminPath,
  roleFromClaims,
} from "./roles";

async function userRole(userId: string, sessionClaims: unknown): Promise<unknown> {
  const fromClaims = roleFromClaims(sessionClaims);
  if (fromClaims.known) return fromClaims.role;
  // Session token not customised (see lib/auth/roles.ts): one Backend API lookup.
  const user = await (await clerkClient()).users.getUser(userId);
  return user.publicMetadata.role;
}

const INTERNAL_HEADER = "x-verity-no-access-fetch";

/**
 * The /admin/no-access page with HTTP 403, URL unchanged. Next ignores the `status` of a proxy
 * rewrite for App Router pages (it answers 200), so a full page load fetches the static
 * no-access page (always reachable, prerendered) and returns it as 403. Everything else keeps
 * the plain rewrite: client-side (RSC) navigations need the flight payload for the rewritten
 * route, and Server Actions (e.g. Clerk's sign-out cache refresh) must reach the app.
 * The fetch has no cookies, so it skips Clerk (see adminProxy): Clerk's dev-instance handshake
 * would otherwise redirect it in a loop. That page is public and static, so nothing is exposed.
 */
async function noAccess(request: NextRequest): Promise<NextResponse> {
  const target = new URL(NO_ACCESS_PATH, request.url);
  // Only a plain page load (GET, not RSC, not a Server Action: Clerk's sign-out posts one).
  const pageLoad =
    request.method === "GET" && !request.headers.has("rsc") && !request.headers.has("next-action");
  if (pageLoad) {
    try {
      const page = await fetch(target, {
        headers: { accept: "text/html", [INTERNAL_HEADER]: "1" },
        cache: "no-store",
        redirect: "manual",
      });
      if (page.ok) {
        return new NextResponse(page.body, {
          status: 403,
          headers: {
            "content-type": page.headers.get("content-type") ?? "text/html; charset=utf-8",
            "cache-control": "private, no-store",
          },
        });
      }
    } catch {
      // fall through to the rewrite: same page, 200
    }
  }
  return NextResponse.rewrite(target, { status: 403 });
}

const clerkProxy = clerkMiddleware(
  async (auth, request) => {
    clerkEnv();
    if (isPublicAdminPath(request.nextUrl.pathname)) return NextResponse.next();
    const { userId, sessionClaims, redirectToSignIn } = await auth();
    if (!userId) return redirectToSignIn({ returnBackUrl: request.url });
    if (!isAdminRole(await userRole(userId, sessionClaims))) {
      return noAccess(request);
    }
    return NextResponse.next();
  },
  { signInUrl: SIGN_IN_PATH },
);

export function adminProxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname === NO_ACCESS_PATH && request.headers.get(INTERNAL_HEADER) === "1") {
    return NextResponse.next();
  }
  return clerkProxy(request, event);
}

/**
 * Admin API routes (/api/blob/*): Clerk runs so the route can call requireAdmin(), but nothing
 * is redirected here — the route answers 401/403 as JSON itself.
 */
export const adminApiProxy = clerkMiddleware(() => {
  clerkEnv();
});
