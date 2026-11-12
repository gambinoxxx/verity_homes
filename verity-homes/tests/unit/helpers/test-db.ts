// Refuse to run DB-backed unit tests without .env.test, or against the dev database.
import { existsSync, readFileSync } from "node:fs";

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host.replace("-pooler", "") : null;
  } catch {
    return null;
  }
}

export function assertTestDatabase(): void {
  if (!existsSync(".env.test")) throw new Error("DB tests need .env.test (Neon test branch).");
  const testHost = hostOf(process.env.DATABASE_URL);
  if (!testHost || testHost.includes("ep-xxxx")) {
    throw new Error(".env.test still has a placeholder DATABASE_URL.");
  }
  if (existsSync(".env.local")) {
    const devUrl = /^DATABASE_URL=["']?([^"'\n]+)["']?/m.exec(
      readFileSync(".env.local", "utf8"),
    )?.[1];
    if (hostOf(devUrl) === testHost) {
      throw new Error(".env.test points at the same database as .env.local. Use the test branch.");
    }
  }
}
