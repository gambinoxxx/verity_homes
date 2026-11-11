import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Loads .env.test (the Neon "test" branch) when it exists. Never .env.local.
    setupFiles: ["tests/setup/env.ts"],
    coverage: { provider: "v8", include: ["lib/**/*.ts"], exclude: ["lib/generated/**"] },
  },
  resolve: {
    alias: {
      "@": root,
      // `server-only` throws outside the React Server Components bundler; stub it for tests.
      "server-only": fileURLToPath(new URL("tests/setup/server-only.ts", import.meta.url)),
    },
  },
});
