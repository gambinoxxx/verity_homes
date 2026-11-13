import type { Metadata } from "next";
import { AuthScreen, authScreenStyles } from "@/components/admin/auth-screen";
import { SIGN_IN_PATH } from "@/lib/auth/roles";
import { SignOutButton, UserButton } from "@/lib/auth/components";

export const metadata: Metadata = { title: "No access" };

/**
 * Shown (HTTP 403, via proxy.ts) to a signed-in user without the admin role. "Sign out" returns
 * them to the sign-in page (to use another account); the user button manages the account.
 */
export default function NoAccessPage() {
  return (
    <AuthScreen>
      <div className={authScreenStyles.card}>
        <h1>No admin access</h1>
        <p>
          You&apos;re signed in, but this account isn&apos;t an admin for Verity Homes and
          Properties. Ask the site owner to give your account access, or sign in with another
          account.
        </p>
        <div className={authScreenStyles.actions}>
          <SignOutButton redirectUrl={SIGN_IN_PATH}>
            <button type="button" className={authScreenStyles.signOut}>
              Sign out
            </button>
          </SignOutButton>
          <UserButton />
        </div>
      </div>
    </AuthScreen>
  );
}
