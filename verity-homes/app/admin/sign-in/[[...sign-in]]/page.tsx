import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthScreen, authScreenStyles } from "@/components/admin/auth-screen";
import { SignIn } from "@/lib/auth/components";

export const metadata: Metadata = { title: "Sign in" };

// Brand colours for Clerk's card (tokens from app/globals.css).
const appearance = {
  variables: {
    colorPrimary: "var(--bg-navy)",
    colorText: "var(--text-primary)",
    colorTextSecondary: "var(--text-muted)",
    fontFamily: "var(--font-sans)",
    borderRadius: "12px",
  },
  // Invitation only: never advertise sign-up here. The real control is the Clerk dashboard
  // (Restrictions → sign-up mode "Restricted"); any account without the admin role gets a 403.
  elements: { footerAction: { display: "none" } },
};

/**
 * Admin sign-in (Clerk <SignIn />), centred on navy. Invitation only: sign-ups are disabled in
 * the Clerk dashboard, and the card offers no sign-up. Under Cache Components the catch-all
 * <SignIn /> must sit in <Suspense>.
 */
export default function SignInPage() {
  return (
    <AuthScreen>
      <h1 className="sr-only">Sign in to Verity admin</h1>
      <Suspense fallback={<div className={authScreenStyles.loading}>Loading sign-in…</div>}>
        <SignIn
          path="/admin/sign-in"
          routing="path"
          fallbackRedirectUrl="/admin"
          withSignUp={false}
          appearance={appearance}
        />
      </Suspense>
    </AuthScreen>
  );
}
