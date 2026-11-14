// Admin sidebar (design/admin.html), in design order. Pages arrive unit by unit; links to admin
// pages that don't exist yet are not prefetched (admin-only, like lib/nav.ts UNBUILT_ROUTES).

export type AdminIcon =
  "dash" | "home" | "chart" | "faq" | "pen" | "tag" | "quote" | "hand" | "inbox" | "gear";
export type AdminNavItem = { label: string; href: string; icon: AdminIcon; unit: number };
export type AdminNavGroup = { label: string | null; items: readonly AdminNavItem[] };

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  { label: null, items: [{ label: "Dashboard", href: "/admin", icon: "dash", unit: 13 }] },
  {
    label: "Content",
    items: [
      { label: "Properties", href: "/admin/properties", icon: "home", unit: 14 },
      { label: "Investment plans", href: "/admin/plans", icon: "chart", unit: 17 },
      { label: "FAQs", href: "/admin/faqs", icon: "faq", unit: 17 },
      { label: "Blog posts", href: "/admin/posts", icon: "pen", unit: 18 },
      { label: "Categories", href: "/admin/categories", icon: "tag", unit: 18 },
      { label: "Testimonials", href: "/admin/testimonials", icon: "quote", unit: 19 },
      { label: "Partners", href: "/admin/partners", icon: "hand", unit: 19 },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Enquiries", href: "/admin/enquiries", icon: "inbox", unit: 16 },
      { label: "Site settings", href: "/admin/settings", icon: "gear", unit: 19 },
    ],
  },
];

/** /admin matches only itself; a section matches itself and its children. */
export function isActiveAdminLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Time-of-day greeting in Lagos time: "Good morning" / "Good afternoon" / "Good evening". */
export function greetingFor(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" })
      .format(date)
      .replace(/\D/g, ""),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
