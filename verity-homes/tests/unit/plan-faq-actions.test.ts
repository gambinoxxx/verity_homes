// Every plan + FAQ action (Unit 17) rejects a non-admin before writing; valid admin calls write
// and update the "plans" / "faqs" cache tags. Auth, cache and DB writes are mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_PLAN } from "@/lib/validation/plan";

class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
const updateTag = vi.fn();
vi.mock("next/cache", () => ({
  updateTag,
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/db/queries/invest", () => ({ PLANS_TAG: "plans", FAQS_TAG: "faqs" }));
const m = {
  findPlanState: vi.fn(async () => ({
    id: "plana1234567",
    slug: "plan-a",
    status: "DRAFT",
    contractWith: "Verity Homes and Properties Ltd",
    payoutTerms: "Paid at maturity.",
    _count: { packages: 1 },
  })),
  isPlanSlugTaken: vi.fn(async () => false),
  insertPlan: vi.fn(async () => ({ id: "plan_new_123", cleared: 0 })),
  savePlan: vi.fn(async () => ({ id: "plan_a_12345", cleared: 0, previousSlug: "plan-a" })),
  setPlanStatus: vi.fn(async () => ({ id: "plan_a_12345", status: "PUBLISHED" })),
  deletePlanRow: vi.fn(async () => ({ name: "P", enquiries: 2 })),
  reorderPlanRows: vi.fn(async () => true),
  insertFaq: vi.fn(async () => ({ id: "faq_new_1234" })),
  updateFaqRow: vi.fn(async () => ({ id: "faq_a_12345" })),
  setFaqStatusRow: vi.fn(async () => ({ id: "faq_a_12345", status: "PUBLISHED" })),
  deleteFaqRow: vi.fn(async () => ({ question: "Q" })),
  reorderFaqRows: vi.fn(async () => true),
};
vi.mock("@/lib/db/mutations/plans", () => m);

const plans = await import("@/lib/actions/plan");
const faqs = await import("@/lib/actions/faq");
const ID = "plan_a_12345".replace(/_/g, "");
const FID = "faqa12345678";
const validPlan = { ...EMPTY_PLAN, name: "[SAMPLE] Starter", minimum: "1,000,000" };
const validFaq = { page: "INVEST", question: "Q?", answer: "A." };

const READS = new Set<unknown>([m.findPlanState, m.isPlanSlugTaken]);
const writes = () =>
  Object.values(m)
    .filter((f) => !READS.has(f))
    .reduce((n, f) => n + f.mock.calls.length, 0);

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
});

const cases: [string, () => Promise<{ ok: boolean }>][] = [
  ["createPlan", () => plans.createPlan(validPlan)],
  ["updatePlan", () => plans.updatePlan(ID, validPlan)],
  ["publishPlan", () => plans.publishPlan(ID)],
  ["unpublishPlan", () => plans.unpublishPlan(ID)],
  ["deletePlan", () => plans.deletePlan(ID)],
  ["reorderPlans", () => plans.reorderPlans([ID, "planb1234567"])],
  ["createFaq", () => faqs.createFaq(validFaq)],
  ["updateFaq", () => faqs.updateFaq(FID, validFaq)],
  ["setFaqStatus", () => faqs.setFaqStatus(FID, "PUBLISHED")],
  ["deleteFaq", () => faqs.deleteFaq(FID)],
  ["reorderFaqs", () => faqs.reorderFaqs("INVEST", [FID, "faqb12345678"])],
];

describe("every action rejects a non-admin without writing", () => {
  for (const [name, run] of cases) {
    it(name, async () => {
      requireAdmin.mockRejectedValue(new ForbiddenError());
      expect(await run()).toEqual({ ok: false, error: "You don't have permission to do that." });
      expect(writes()).toBe(0);
      expect(updateTag).not.toHaveBeenCalled();
    });
  }
});

describe("admins: write, then update the right cache tag", () => {
  for (const [name, run] of cases) {
    it(name, async () => {
      expect((await run()).ok).toBe(true);
      expect(writes()).toBe(1);
      expect(updateTag).toHaveBeenCalledWith(name.toLowerCase().includes("faq") ? "faqs" : "plans");
    });
  }

  it("bad input is rejected before the admin check", async () => {
    expect((await plans.createPlan({ ...validPlan, summary: "Guaranteed 30%" })).ok).toBe(false);
    expect((await plans.reorderPlans([ID, ID])).ok).toBe(false); // duplicates
    expect((await faqs.setFaqStatus(FID, "ARCHIVED")).ok).toBe(false);
    expect((await faqs.reorderFaqs("HOME", [FID])).ok).toBe(false);
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(writes()).toBe(0);
  });
});
