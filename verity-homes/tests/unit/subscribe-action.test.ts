// subscribe() against the Neon test branch.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { assertTestDatabase } from "./helpers/test-db";

assertTestDatabase();

const { db } = await import("@/lib/db/client");
const { subscribe } = await import("@/lib/actions/subscribe");

const DOMAIN = "subscribe-test.example";
const fd = (email: string, company = "") => {
  const f = new FormData();
  f.set("email", email);
  f.set("company", company);
  return f;
};

afterAll(async () => {
  await db.subscriber.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  await db.$disconnect();
});

describe("subscribe", () => {
  it("adds the email (lower-cased) and treats a repeat sign-up as success", async () => {
    const email = `Test-${randomUUID().slice(0, 6)}@${DOMAIN}`;
    expect((await subscribe(null, fd(email)))?.ok).toBe(true);
    expect((await subscribe(null, fd(email)))?.ok).toBe(true);
    expect(await db.subscriber.count({ where: { email: email.toLowerCase() } })).toBe(1);
  });

  it("rejects an invalid email with a friendly message", async () => {
    expect(await subscribe(null, fd("not-an-email"))).toEqual({
      ok: false,
      error: "Enter a valid email address",
    });
  });

  it("rejects a filled honeypot without saving", async () => {
    const email = `bot-${randomUUID().slice(0, 6)}@${DOMAIN}`;
    expect((await subscribe(null, fd(email, "Acme")))?.ok).toBe(false);
    expect(await db.subscriber.count({ where: { email } })).toBe(0);
  });
});
