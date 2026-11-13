import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth/components";

// Every /admin page (sign-in included) is private: never indexed or followed.
export const metadata: Metadata = {
  title: { default: "Admin — Verity Homes and Properties", template: "%s — Verity admin" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Clerk is loaded for /admin only — public pages never call Clerk (context/architecture.md,
 * Open question 42). ClerkProvider without `dynamic` needs no <Suspense> under Cache Components.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AuthProvider afterSignOutUrl="/admin/sign-in" signInUrl="/admin/sign-in">
      {children}
    </AuthProvider>
  );
}
