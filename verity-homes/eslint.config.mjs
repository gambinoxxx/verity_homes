import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Clerk is confined to lib/auth (context/architecture.md): pages and proxy.ts import from there.
const CLERK_ONLY_IN_LIB_AUTH = {
  group: ["@clerk/*"],
  message: "Import Clerk only in lib/auth (use @/lib/auth or @/lib/auth/components).",
};

// Vercel Blob is confined to lib/storage (uploads and deletes).
const BLOB_ONLY_IN_LIB_STORAGE = {
  group: ["@vercel/blob", "@vercel/blob/*"],
  message: "Import Vercel Blob only in lib/storage.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Feature secrets (Clerk, Blob, Resend) are read only by their adapter modules, so a
  // missing service never breaks pages that don't use it (context/architecture.md).
  {
    files: ["**/*.{ts,tsx,mjs}"],
    ignores: ["lib/auth/**", "lib/storage/**", "lib/email/**", "tests/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/env",
              importNames: ["clerkEnv", "blobEnv", "emailEnv"],
              message: "Only lib/auth, lib/storage and lib/email may read feature secrets.",
            },
          ],
          patterns: [CLERK_ONLY_IN_LIB_AUTH, BLOB_ONLY_IN_LIB_STORAGE],
        },
      ],
    },
  },
  // lib/storage and lib/email may read their own secrets, but still not import Clerk.
  {
    files: ["lib/storage/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [CLERK_ONLY_IN_LIB_AUTH] }] },
  },
  {
    files: ["lib/email/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [CLERK_ONLY_IN_LIB_AUTH, BLOB_ONLY_IN_LIB_STORAGE] },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference material and copy sources, not app code:
    "design/**",
    "backend/**",
    "testing/**",
    "brand/**",
    "prompts/**",
    "test-results/**",
    "lib/generated/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
