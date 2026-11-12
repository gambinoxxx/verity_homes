import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Placeholder values only: these tests check which variables are required, not real secrets.
const CORE = {
  DATABASE_URL: "postgresql://user:pass@host.example/db",
  NEXT_PUBLIC_SITE_URL: "https://example.vercel.app",
  IP_HASH_SALT: "a-test-salt-of-at-least-16-chars",
};
const FEATURE_VARS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "RESEND_API_KEY",
  "ENQUIRY_NOTIFY_TO",
  "ENQUIRY_FROM",
];

/** Fresh copy of lib/env with only the core vars set (as on Vercel today). */
async function loadWithCoreOnly() {
  for (const [k, v] of Object.entries(CORE)) vi.stubEnv(k, v);
  for (const k of [...FEATURE_VARS, "DIRECT_URL"]) vi.stubEnv(k, undefined);
  vi.resetModules();
  return import("@/lib/env");
}

describe("core env", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("loads with only DATABASE_URL, NEXT_PUBLIC_SITE_URL and IP_HASH_SALT", async () => {
    const { env } = await loadWithCoreOnly();
    expect(env.DATABASE_URL).toBe(CORE.DATABASE_URL);
    expect(env.DIRECT_URL).toBeUndefined();
  });

  it("names a missing core variable", async () => {
    const { parseCoreEnv } = await loadWithCoreOnly();
    expect(() => parseCoreEnv({ ...CORE, IP_HASH_SALT: undefined })).toThrow(/IP_HASH_SALT/);
    expect(() => parseCoreEnv({ ...CORE, DATABASE_URL: "not a url" })).toThrow(/DATABASE_URL/);
  });

  it("never puts a value in the error message", async () => {
    const { parseCoreEnv } = await loadWithCoreOnly();
    expect(() => parseCoreEnv({ ...CORE, DATABASE_URL: "secret-value" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("secret-value") }),
    );
  });
});

describe("feature env (validated on first call)", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => vi.unstubAllEnvs());

  it("clerkEnv() names the missing Clerk variables", async () => {
    const { clerkEnv } = await loadWithCoreOnly();
    expect(() => clerkEnv()).toThrow(/CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
  });

  it("blobEnv() names BLOB_READ_WRITE_TOKEN", async () => {
    const { blobEnv } = await loadWithCoreOnly();
    expect(() => blobEnv()).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it("emailEnv() names exactly the missing email variable", async () => {
    const mod = await loadWithCoreOnly();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("ENQUIRY_FROM", "Verity Website <website@example.com>");
    expect(() => mod.emailEnv()).toThrow(/: ENQUIRY_NOTIFY_TO\./);
  });

  it("returns the values once they are set", async () => {
    const { blobEnv } = await loadWithCoreOnly();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    expect(blobEnv().BLOB_READ_WRITE_TOKEN).toBe("vercel_blob_rw_test");
  });
});

describe("ENQUIRY_FROM format (what Resend accepts)", () => {
  afterEach(() => vi.unstubAllEnvs());

  for (const [value, ok] of [
    ["Verity Website <onboarding@resend.dev>", true],
    ["onboarding@resend.dev", true],
    ["<onboarding@resend.dev>", false], // brackets without a name: Resend rejects it (422)
    ["Verity Website", false],
  ] as const) {
    it(`${ok ? "accepts" : "rejects"} ${JSON.stringify(value)}`, async () => {
      const { emailEnv } = await loadWithCoreOnly();
      vi.stubEnv("RESEND_API_KEY", "re_test");
      vi.stubEnv("ENQUIRY_NOTIFY_TO", "delivered@resend.dev");
      vi.stubEnv("ENQUIRY_FROM", value);
      if (ok) expect(emailEnv().ENQUIRY_FROM).toBe(value);
      else expect(() => emailEnv()).toThrow(/: ENQUIRY_FROM\./);
    });
  }
});
