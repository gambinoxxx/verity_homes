// Unit 20b: retry READ queries on a dropped Neon connection; never writes.
import { describe, expect, it, vi } from "vitest";
import { RETRY_DELAYS_MS, shouldRetry, transientReason, withReadRetry } from "@/lib/db/retry";

// Shaped like what Prisma 7 + the Neon adapter throw: the driver error is wrapped.
const wrapped = (driverMessage: string) =>
  Object.assign(new Error("Invalid `prisma.property.findMany()` invocation"), {
    code: "P2010",
    meta: { driverAdapterError: new Error(driverMessage) },
  });

describe("transientReason / shouldRetry", () => {
  it.each([
    ["fetch failed", new TypeError("fetch failed")],
    ["ECONNRESET", Object.assign(new Error("read ECONNRESET"), { code: "ECONNRESET" })],
    ["socket closed", new Error("other side closed")],
    ["socket closed", new Error("Connection terminated unexpectedly")],
    ["terminating connection", wrapped("terminating connection due to administrator command")],
    ["websocket error", new Error("[object ErrorEvent]")],
    ["fetch failed", new Error("outer", { cause: new TypeError("fetch failed") })],
  ])("%s is transient", (label, err) => {
    expect(transientReason(err)).toBe(label);
    expect(shouldRetry("findMany", err, 0)).toBe(true);
  });

  it.each([
    [
      "a unique constraint",
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    ],
    ["a bad query", new Error("Invalid `prisma.post.findMany()` invocation: Unknown argument")],
    ["a wrong password", wrapped("AuthenticationFailed")],
    ["not an error", "boom"],
  ])("%s is not retried", (_, err) => {
    expect(transientReason(err)).toBeNull();
    expect(shouldRetry("findMany", err, 0)).toBe(false);
  });

  it("only reads are retried, never writes", () => {
    const err = new TypeError("fetch failed");
    for (const op of ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy"])
      expect(shouldRetry(op, err, 0), op).toBe(true);
    for (const op of [
      "create",
      "createMany",
      "update",
      "updateMany",
      "upsert",
      "delete",
      "deleteMany",
    ])
      expect(shouldRetry(op, err, 0), op).toBe(false);
  });

  it("at most two retries", () => {
    const err = new TypeError("fetch failed");
    expect(shouldRetry("findMany", err, 1)).toBe(true);
    expect(shouldRetry("findMany", err, 2)).toBe(false);
  });
});

describe("withReadRetry", () => {
  const deps = () => ({
    sleep: vi.fn(async (_ms: number) => {}),
    log: vi.fn<(m: string) => void>(),
  });

  it("a read that drops twice succeeds on the third try, after ~150 then ~400 ms", async () => {
    const d = deps();
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockRejectedValueOnce(new Error("terminating connection due to administrator command"))
      .mockResolvedValueOnce("rows");
    await expect(withReadRetry("Property", "findMany", run, d)).resolves.toBe("rows");
    expect(run).toHaveBeenCalledTimes(3);
    expect(d.sleep.mock.calls.map((c) => c[0])).toEqual([...RETRY_DELAYS_MS]);
    expect(RETRY_DELAYS_MS).toEqual([150, 400]);
    expect(d.log).toHaveBeenCalledTimes(2);
    expect(d.log.mock.calls[0]![0]).toBe(
      "db: Property.findMany failed (fetch failed); retry 1/2 in 150 ms",
    );
  });

  it("gives up after two retries and throws the last error", async () => {
    const d = deps();
    const run = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(withReadRetry("Post", "findFirst", run, d)).rejects.toThrow("fetch failed");
    expect(run).toHaveBeenCalledTimes(3);
  });

  it("a write is tried once, even on a dropped connection", async () => {
    const d = deps();
    const run = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(withReadRetry("Enquiry", "create", run, d)).rejects.toThrow();
    expect(run).toHaveBeenCalledTimes(1);
    expect(d.sleep).not.toHaveBeenCalled();
  });

  it("logs never include the driver's message (it could name the host)", async () => {
    const d = deps();
    const secretish = "fetch failed for postgresql://user:pw@ep-x.neon.tech/db";
    const run = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error(secretish))
      .mockResolvedValueOnce(1);
    await withReadRetry("Property", "count", run, d);
    expect(d.log.mock.calls[0]![0]).not.toMatch(/postgresql|neon\.tech|pw@/);
  });
});
