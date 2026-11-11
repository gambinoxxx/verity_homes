"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, isActiveLink, prefetchFor } from "@/lib/nav";

type NavLinksProps = { onNavigate?: () => void };

/** The six main links, with aria-current on the active section. */
export function NavLinks({ onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  return <NavLinkList pathname={pathname} onNavigate={onNavigate} />;
}

/**
 * Same links without reading the URL. Used as the Suspense fallback: with cacheComponents,
 * usePathname suspends on dynamic routes that are not known at build time.
 */
export function NavLinkList({
  pathname = null,
  onNavigate,
}: NavLinksProps & { pathname?: string | null }) {
  return MAIN_NAV.map((link) => (
    <Link
      key={link.href}
      href={link.href}
      prefetch={prefetchFor(link.href)}
      onClick={onNavigate}
      aria-current={isActiveLink(pathname, link.href) ? "page" : undefined}
    >
      {link.label}
    </Link>
  ));
}
