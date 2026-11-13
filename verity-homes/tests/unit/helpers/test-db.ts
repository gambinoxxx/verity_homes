// Refuse to run DB-backed unit tests without .env.test, or against the dev database.
import { existsSync, readFileSync } from "node:fs";
import { vi } from "vitest";

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).host.replace("-pooler", "") : null;
  } catch {
    return null;
  }
}

/**
 * Database-backed tests talk to Neon over the internet: the first connection can take 1–2 s and
 * a short transaction ~1 s from Lagos, so a test with several queries outgrows Vitest's 5 s
 * default (Q41). These files get 30 s per test and 60 s per setup hook; every other test keeps
 * the default.
 */
export function setDatabaseTimeouts(): void {
  vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });
}

export function assertTestDatabase(): void {
  setDatabaseTimeouts();
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
