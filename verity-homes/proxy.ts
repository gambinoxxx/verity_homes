// Next 16 Proxy (formerly middleware). Unit 12 adds Clerk's /admin protection here.
//
// /properties/[slug]: with Cache Components the page sends its prerendered shell (HTTP 200)
// before it can look the slug up, so notFound() / permanentRedirect() inside the page could not
// set the status (docs: file-conventions/loading.md "Status codes"). This check runs first:
// - published slug → render the page
// - old slug in SlugRedirect → 308 to the current slug
// - unknown or draft slug → 404 (rewritten to an unmatched path, which renders app/not-found.tsx)
import { NextResponse, type NextRequest } from "next/server";
import { resolvePropertySlug } from "@/lib/db/queries/properties";

const NOT_FOUND_PATH = "/__not-found";

export async function proxy(request: NextRequest) {
  const match = /^\/properties\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  if (!match?.[1]) return NextResponse.next();

  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  const status = await resolvePropertySlug(slug);
  if (status.kind === "published") return NextResponse.next();
  if (status.kind === "redirect") {
    const to = request.nextUrl.clone();
    to.pathname = `/properties/${encodeURIComponent(status.to)}`;
    return NextResponse.redirect(to, 308);
  }
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: "/properties/:slug",
};
