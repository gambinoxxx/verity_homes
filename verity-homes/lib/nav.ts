// Main navigation, shared by the header, the mobile drawer and the footer.
export type NavLink = { label: string; href: string };

export const MAIN_NAV: readonly NavLink[] = [
  { label: "Properties", href: "/properties" },
  { label: "Invest", href: "/invest" },
  { label: "Services", href: "/#services" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/**
 * True when `href` is the current section: an exact match or a child route
 * (/properties is active on /properties/some-slug). Hash links like /#services never are.
 */
export function isActiveLink(pathname: string | null, href: string): boolean {
  if (!pathname || href.includes("#") || href === "/") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Public routes linked from the site that have no page yet. <Link> prefetching them
 * returns 404s that show up as console errors, so prefetch is off for these until built.
 * A trailing "/*" covers child routes. Remove an entry in the unit that builds its page.
 */
export const UNBUILT_ROUTES: readonly string[] = [
  "/invest", // Unit 9
  "/about", // Unit 10
  "/privacy", // Unit 10
  "/blog", // Unit 11
  "/blog/*", // Unit 11
  "/contact", // Unit 8
];

/** `prefetch` prop for a <Link>: false for routes not built yet, otherwise Next's default. */
export function prefetchFor(href: string): false | undefined {
  const path = href.split(/[?#]/)[0] || "/";
  const unbuilt = UNBUILT_ROUTES.some((r) =>
    r.endsWith("/*") ? path.startsWith(r.slice(0, -1)) : path === r,
  );
  return unbuilt ? false : undefined;
}
