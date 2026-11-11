import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
        },
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
