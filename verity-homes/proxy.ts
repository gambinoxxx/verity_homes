// Next 16 Proxy (formerly middleware).
//
// /admin/*: Clerk (lib/auth/proxy.ts) — signed out → 307 to /admin/sign-in, no admin role → 403.
// /api/blob/*, /api/admin/*: Clerk runs (no redirects) so those routes check the admin
// themselves and answer 401/403.
// Only admin paths run Clerk; public pages never do.
//
// /properties/[slug] and /blog/[slug]: with Cache Components the page sends its prerendered
// shell (HTTP 200) before it can look the slug up, so notFound() / permanentRedirect() inside the
// page could not set the status (docs: file-conventions/loading.md "Status codes"). This check
// runs first:
// - published slug → render the page
// - old slug in SlugRedirect → 308 to the current slug
// - unknown or draft slug → 404 (rewritten to an unmatched path, which renders app/not-found.tsx)
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { adminApiProxy, adminProxy } from "@/lib/auth/proxy";
import { isAdminApiPath, isAdminPath } from "@/lib/auth/roles";
import { resolvePostSlug } from "@/lib/db/queries/posts";
import { resolvePropertySlug } from "@/lib/db/queries/properties";

const NOT_FOUND_PATH = "/__not-found";

const SLUG_ROUTES = [
  { base: "/properties", resolve: resolvePropertySlug },
  { base: "/blog", resolve: resolvePostSlug },
] as const;

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isAdminPath(request.nextUrl.pathname)) return adminProxy(request, event);
  if (isAdminApiPath(request.nextUrl.pathname)) return adminApiProxy(request, event);

  const match = /^\/(properties|blog)\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  const route = SLUG_ROUTES.find((r) => r.base === `/${match?.[1]}`);
  if (!match?.[2] || !route) return NextResponse.next();

  let slug: string;
  try {
    slug = decodeURIComponent(match[2]);
  } catch {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  const status = await route.resolve(slug);
  if (status.kind === "published") return NextResponse.next();
  if (status.kind === "redirect") {
    const to = request.nextUrl.clone();
    to.pathname = `${route.base}/${encodeURIComponent(status.to)}`;
    return NextResponse.redirect(to, 308);
  }
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/blob/:path*", "/api/admin/:path*", "/properties/:slug", "/blog/:slug"],
};
