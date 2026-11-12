// createEnquiry against the Neon test branch, with next/headers and the email module mocked.
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { assertTestDatabase } from "./helpers/test-db";

assertTestDatabase();

const headerState = { ip: "203.0.113.1" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": headerState.ip }),
}));
const sendEnquiryEmail = vi.fn();
vi.mock("@/lib/email/enquiry", () => ({ sendEnquiryEmail }));

const { db } = await import("@/lib/db/client");
const { createEnquiry } = await import("@/lib/actions/enquiry");
const { hashIp } = await import("@/lib/ip-hash");

const TAG = "[TEST] enquiry";
const RATE_LIMITED = /several messages already/;

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  const all = {
    source: "HOME_PAGE",
    interest: "BUYING",
    phone: "08030000000",
    startedAt: String(Date.now() - 10_000),
    company: "",
    ...fields,
  };
  for (const [k, v] of Object.entries(all)) fd.set(k, v);
  return fd;
}
const uniqueName = () => `${TAG} ${randomUUID().slice(0, 8)}`;
/** A fresh documentation-range IP per test, so tests don't share a rate-limit bucket. */
const freshIp = () =>
  `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID().slice(0, 4)}`;

beforeEach(() => {
  sendEnquiryEmail.mockReset();
  headerState.ip = freshIp();
});

afterAll(async () => {
  await db.enquiry.deleteMany({ where: { name: { startsWith: TAG } } });
  await db.$disconnect();
});

describe("createEnquiry", () => {
  it("saves the enquiry before sending the email, then records emailSentAt", async () => {
    const name = uniqueName();
    let rowExistedWhenEmailSent = false;
    sendEnquiryEmail.mockImplementation(async () => {
      rowExistedWhenEmailSent = (await db.enquiry.count({ where: { name } })) === 1;
      return true;
    });
    const result = await createEnquiry(null, form({ name, message: "Hello" }));
    expect(result).toEqual({ ok: true, message: expect.stringMatching(/thank you/i) });
    expect(rowExistedWhenEmailSent).toBe(true);
    const row = await db.enquiry.findFirstOrThrow({ where: { name } });
    expect(row.emailSentAt).not.toBeNull();
    expect(row.phone).toBe("2348030000000");
    expect(row.ipHash).toBe(hashIp(headerState.ip));
    expect(row.ipHash).not.toContain(headerState.ip);
  });

  it("keeps the enquiry when the email fails (emailSentAt stays null) and still reports success", async () => {
    const name = uniqueName();
    sendEnquiryEmail.mockResolvedValue(false);
    const result = await createEnquiry(null, form({ name }));
    expect(result?.ok).toBe(true);
    const row = await db.enquiry.findFirstOrThrow({ where: { name } });
    expect(row.emailSentAt).toBeNull();
  });

  it("rejects a filled honeypot without saving or emailing", async () => {
    const name = uniqueName();
    const result = await createEnquiry(null, form({ name, company: "Acme Bots Ltd" }));
    expect(result?.ok).toBe(false);
    expect(await db.enquiry.count({ where: { name } })).toBe(0);
    expect(sendEnquiryEmail).not.toHaveBeenCalled();
  });

  it("rate-limits after 5 enquiries per IP per hour, with the friendly message", async () => {
    const ipHash = hashIp(headerState.ip);
    await db.enquiry.createMany({
      data: Array.from({ length: 5 }, () => ({
        name: uniqueName(),
        phone: "2348030000000",
        source: "HOME_PAGE" as const,
        ipHash,
      })),
    });
    const name = uniqueName();
    const result = await createEnquiry(null, form({ name }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(RATE_LIMITED) });
    expect(await db.enquiry.count({ where: { name } })).toBe(0);
    // A different visitor is not affected.
    headerState.ip = freshIp();
    sendEnquiryEmail.mockResolvedValue(true);
    expect((await createEnquiry(null, form({ name: uniqueName() })))?.ok).toBe(true);
  });

  it("returns field errors (no raw errors) and saves nothing when required fields are missing", async () => {
    const result = await createEnquiry(null, form({ name: "", phone: "" }));
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { name: expect.any(String), phone: expect.any(String) },
    });
    expect(sendEnquiryEmail).not.toHaveBeenCalled();
  });

  it("asks the visitor to try again when submitted faster than the minimum fill time", async () => {
    const name = uniqueName();
    const result = await createEnquiry(null, form({ name, startedAt: String(Date.now()) }));
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(await db.enquiry.count({ where: { name } })).toBe(0);
  });

  it("links published properties only; a draft property id is dropped", async () => {
    sendEnquiryEmail.mockResolvedValue(true);
    const published = await db.property.findFirstOrThrow({ where: { status: "PUBLISHED" } });
    const draft = await db.property.findFirstOrThrow({ where: { status: "DRAFT" } });
    const a = uniqueName();
    const b = uniqueName();
    await createEnquiry(null, form({ name: a, source: "PROPERTY_PAGE", propertyId: published.id }));
    await createEnquiry(null, form({ name: b, source: "PROPERTY_PAGE", propertyId: draft.id }));
    expect((await db.enquiry.findFirstOrThrow({ where: { name: a } })).propertyId).toBe(
      published.id,
    );
    expect((await db.enquiry.findFirstOrThrow({ where: { name: b } })).propertyId).toBeNull();
    // The email gets the property's title and slug for its link.
    expect(sendEnquiryEmail.mock.calls[0]?.[0]).toMatchObject({
      property: { title: published.title, slug: published.slug },
    });
  });

  it("stores an investment amount in kobo, and rejects an invalid one", async () => {
    sendEnquiryEmail.mockResolvedValue(true);
    const name = uniqueName();
    await createEnquiry(
      null,
      form({ name, source: "INVEST_PAGE", interest: "INVESTING", amount: "₦2,500,000" }),
    );
    expect((await db.enquiry.findFirstOrThrow({ where: { name } })).amountKobo).toBe(250_000_000n);
    const bad = await createEnquiry(null, form({ name: uniqueName(), amount: "lots" }));
    expect(bad).toMatchObject({ ok: false, fieldErrors: { amount: expect.any(String) } });
  });
});
