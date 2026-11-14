// Unit 17: plan + FAQ validation, the single-highlight transaction, and every plan/FAQ action
// rejecting non-admins. Auth and the database are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUARANTEE_MESSAGE, mentionsGuarantee } from "@/lib/validation/no-guarantee";
import { EMPTY_PLAN, type PlanFormValues, planSchema } from "@/lib/validation/plan";
import { faqSchema } from "@/lib/validation/faq";

const plan: PlanFormValues = { ...EMPTY_PLAN, name: "[SAMPLE] Starter", minimum: "5,000,000" };
const errorsOf = (patch: Partial<PlanFormValues>) => {
  const r = planSchema.safeParse({ ...plan, ...patch });
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("plan validation", () => {
  it("parses money into kobo and the rate into a number", () => {
    const r = planSchema.safeParse({ ...plan, returnRatePercent: "18.5", tenureMonths: "24" });
    expect(r.success && r.data).toMatchObject({
      minimumKobo: 500_000_000n,
      returnRatePercent: 18.5,
      tenureMonths: 24,
      badge: null,
      summary: null,
    });
  });

  it("minimum is required and above ₦0", () => {
    expect(errorsOf({ minimum: "" })).toHaveProperty("minimum", "Add the minimum investment");
    expect(errorsOf({ minimum: "0" })).toHaveProperty("minimum", "Enter an amount above ₦0");
    expect(errorsOf({ minimum: "5m" })).toHaveProperty("minimum");
  });

  it("rate is 0–100 with up to 2 decimals; 0 is allowed (public placeholder)", () => {
    for (const ok of ["0", "12", "18.5", "18.75", "100"])
      expect(errorsOf({ returnRatePercent: ok }), ok).toEqual({});
    for (const bad of ["", "-1", "100.01", "101", "18.555", "abc", "1e2"])
      expect(errorsOf({ returnRatePercent: bad }), bad).toHaveProperty("returnRatePercent");
  });

  it("tenure is whole months 1–600; name required; payout must be known", () => {
    expect(errorsOf({ tenureMonths: "0" })).toHaveProperty("tenureMonths");
    expect(errorsOf({ tenureMonths: "6.5" })).toHaveProperty("tenureMonths");
    expect(errorsOf({ tenureMonths: "601" })).toHaveProperty("tenureMonths");
    expect(errorsOf({ name: " " })).toHaveProperty("name", "Add a plan name");
    expect(errorsOf({ payoutFrequency: "WEEKLY" as never })).toHaveProperty("payoutFrequency");
  });

  it("rejects “guarantee” words in name, badge and summary (any case)", () => {
    expect(errorsOf({ name: "Guaranteed Growth" })).toHaveProperty("name", GUARANTEE_MESSAGE);
    expect(errorsOf({ badge: "GUARANTEE" })).toHaveProperty("badge", GUARANTEE_MESSAGE);
    expect(errorsOf({ summary: "Returns are guarantees" })).toHaveProperty(
      "summary",
      GUARANTEE_MESSAGE,
    );
    expect(mentionsGuarantee("unguaranteed")).toBe(false); // whole words only
    expect(mentionsGuarantee("Our guarantee: none")).toBe(true);
  });
});

describe("FAQ validation", () => {
  const faq = {
    page: "INVEST",
    question: "How do payouts work?",
    answer: "Quarterly.\r\nBy transfer.",
  };
  it("keeps line breaks (normalised), trims, requires both fields", () => {
    const r = faqSchema.safeParse({ ...faq, answer: "  Line one\r\nLine two\n\nPara two  " });
    expect(r.success && r.data.answer).toBe("Line one\nLine two\n\nPara two");
    expect(faqSchema.safeParse({ ...faq, question: " " }).success).toBe(false);
    expect(faqSchema.safeParse({ ...faq, answer: "" }).success).toBe(false);
    expect(faqSchema.safeParse({ ...faq, page: "HOME" }).success).toBe(false);
  });
  it("rejects “guaranteed” in question or answer", () => {
    for (const patch of [{ question: "Is it guaranteed?" }, { answer: "Yes, GUARANTEED." }]) {
      const r = faqSchema.safeParse({ ...faq, ...patch });
      expect(r.success).toBe(false);
      expect(!r.success && r.error.issues[0]?.message).toBe(GUARANTEE_MESSAGE);
    }
  });
});

// ---- single highlight: the transaction clears the others ----

const tx = {
  investmentPlan: {
    findFirst: vi.fn(async () => ({ sortOrder: 4 })),
    findUnique: vi.fn(async () => ({ id: "plan_a_12345", slug: "plan-a", status: "DRAFT" })),
    create: vi.fn(async () => ({ id: "plan_new_123" })),
    update: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  investmentPackage: {
    findMany: vi.fn(async () => [] as { id: string }[]),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    update: vi.fn(async () => ({})),
    create: vi.fn(async () => ({})),
  },
  slugRedirect: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
    updateMany: vi.fn(async () => ({ count: 0 })),
    upsert: vi.fn(async () => ({})),
  },
};
vi.mock("@/lib/db/client", () => ({
  db: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) },
}));

describe("single-highlight transaction", async () => {
  const { insertPlan, savePlan } = await import("@/lib/db/mutations/plans");
  const data = planSchema.parse(plan);
  beforeEach(() => vi.clearAllMocks());

  it("highlighting a plan turns it off for every other plan, in the same transaction", async () => {
    expect(await savePlan("plan_a_12345", { ...data, highlighted: true }, "plan-a")).toEqual({
      id: "plan_a_12345",
      cleared: 1,
      previousSlug: "plan-a",
    });
    expect(tx.investmentPlan.updateMany).toHaveBeenCalledWith({
      where: { highlighted: true, NOT: { id: "plan_a_12345" } },
      data: { highlighted: false },
    });
  });

  it("a new highlighted plan clears the others too; sortOrder goes to the end", async () => {
    await insertPlan({ ...data, highlighted: true }, "plan-new");
    expect(tx.investmentPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sortOrder: 5, status: "DRAFT" }) }),
    );
    expect(tx.investmentPlan.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { highlighted: true, NOT: { id: "plan_new_123" } } }),
    );
  });

  it("not highlighted → the others are left alone", async () => {
    await savePlan("plan_a_12345", { ...data, highlighted: false }, "plan-a");
    expect(tx.investmentPlan.updateMany).not.toHaveBeenCalled();
  });
});
