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
 * Public routes linked from the shell that have no page yet. <Link> prefetching them
 * returns 404s that show up as console errors, so prefetch is off for these until built.
 * Remove a route from this list in the unit that builds its page.
 */
export const UNBUILT_ROUTES: ReadonlySet<string> = new Set([
  "/properties", // Unit 5
  "/invest", // Unit 9
  "/about", // Unit 10
  "/blog", // Unit 11
  "/contact", // Unit 8
  "/privacy", // no unit yet (Open question 15)
]);

/** `prefetch` prop for a <Link>: false for routes not built yet, otherwise Next's default. */
export function prefetchFor(href: string): false | undefined {
  const path = href.split("#")[0] || "/";
  return UNBUILT_ROUTES.has(path) ? false : undefined;
}
