// Clerk UI, re-exported so Clerk imports stay inside lib/auth (eslint no-restricted-imports).
// Admin only: the public site never loads Clerk (context/architecture.md).
export { ClerkProvider as AuthProvider, SignIn, SignOutButton, UserButton } from "@clerk/nextjs";
