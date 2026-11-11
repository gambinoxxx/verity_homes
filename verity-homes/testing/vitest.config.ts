import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    coverage: { provider: "v8", include: ["lib/**/*.ts"], exclude: ["lib/generated/**"] },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
