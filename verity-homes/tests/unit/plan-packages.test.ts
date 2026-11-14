// Unit 17c: package maths (gain, % per year, "from"), package texts, package validation, the
// publish rules, and the publish action refusing incomplete plans (and non-admins).
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  annualisedPercent,
  formatPercent,
  packageGainKobo,
  planFromAmountKobo,
  tenureLabel,
} from "@/lib/invest";
import { packageEnquiryMessage, packageName, packageSummary } from "@/lib/packages";
import { GUARANTEE_MESSAGE } from "@/lib/validation/no-guarantee";
import {
  EMPTY_PLAN,
  type PlanFormValues,
  planPublishIssues,
  planSchema,
} from "@/lib/validation/plan";

const N = (naira: number) => BigInt(naira) * 100n;
const P20 = { amountKobo: N(20_000_000), returnAmountKobo: N(21_000_000), tenureMonths: 12 };

describe("package maths", () => {
  it("gain = receive − invest, exact to the kobo (never rounded)", () => {
    expect(packageGainKobo(P20)).toBe(N(1_000_000));
    expect(
      packageGainKobo({ amountKobo: 1_000_001n, returnAmountKobo: 1_050_002n, tenureMonths: 12 }),
    ).toBe(50_001n);
  });

  it("% per year = ((r/a)^(12/t) − 1) × 100, 1 decimal", () => {
    expect(annualisedPercent(P20)).toBe(5);
    // ₦30M → ₦32.5M over 12 months = 8.333…% → 8.3%
    const p30 = { amountKobo: N(30_000_000), returnAmountKobo: N(32_500_000), tenureMonths: 12 };
    expect(annualisedPercent(p30)).toBe(8.3);
    expect(formatPercent(annualisedPercent(p30)!)).toBe("8.3%");
    // 6 months: (1.05)^2 − 1 = 10.25% → 10.3%
    expect(annualisedPercent({ ...P20, tenureMonths: 6 })).toBe(10.3);
    // 24 months: sqrt(1.05) − 1 = 2.47% → 2.5%
    expect(annualisedPercent({ ...P20, tenureMonths: 24 })).toBe(2.5);
  });

  it("returns null for impossible input", () => {
    expect(annualisedPercent({ ...P20, tenureMonths: 0 })).toBeNull();
    expect(annualisedPercent({ ...P20, amountKobo: 0n })).toBeNull();
  });

  it("the plan's “from” is the smallest package; none → null", () => {
    expect(
      planFromAmountKobo([
        { amountKobo: N(20_000_000) },
        { amountKobo: N(10_000_000) },
        { amountKobo: N(30_000_000) },
      ]),
    ).toBe(N(10_000_000));
    expect(planFromAmountKobo([])).toBeNull();
    expect(tenureLabel([12, 12, 12])).toBe("12 months");
  });

  it("texts name the package and the expected amount", () => {
    expect(packageName(P20)).toBe("₦20,000,000 package");
    expect(packageName({ ...P20, label: "Starter" })).toBe("Starter (₦20,000,000)");
    expect(packageEnquiryMessage(P20, "[SAMPLE] 12-Month Plan")).toBe(
      "I'm interested in the ₦20,000,000 package (receive ₦21,000,000 after 12 months) — [SAMPLE] 12-Month Plan.",
    );
    expect(packageSummary(P20)).toBe("₦20,000,000 package — receive ₦21,000,000 after 12 months");
  });
});

const base: PlanFormValues = { ...EMPTY_PLAN, name: "[SAMPLE] 12-Month", minimum: "" };
const pkg = { label: "", amount: "20,000,000", receive: "21,000,000", tenureMonths: "12" };
const errorsOf = (patch: Partial<PlanFormValues>) => {
  const r = planSchema.safeParse({ ...base, ...patch });
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("package validation", () => {
  it("parses packages into kobo; plan minimum/tenure come from the packages", () => {
    const r = planSchema.safeParse({
      ...base,
      packages: [pkg, { ...pkg, amount: "10,000,000", receive: "10,500,000", tenureMonths: "6" }],
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.packages).toMatchObject([
      {
        amountKobo: N(20_000_000),
        returnAmountKobo: N(21_000_000),
        tenureMonths: 12,
        sortOrder: 0,
      },
      { amountKobo: N(10_000_000), tenureMonths: 6, sortOrder: 1 },
    ]);
    expect(r.data.minimumKobo).toBe(N(10_000_000));
    expect(r.data.tenureMonths).toBe(6);
  });

  it("receive must be more than invest", () => {
    expect(errorsOf({ packages: [{ ...pkg, receive: "20,000,000" }] })).toHaveProperty(
      "packages.0.receive",
      "What they receive must be more than what they invest",
    );
    expect(errorsOf({ packages: [{ ...pkg, receive: "19,000,000" }] })).toHaveProperty(
      "packages.0.receive",
    );
  });

  it("tenure is whole months 1–120", () => {
    for (const bad of ["0", "121", "6.5", ""])
      expect(errorsOf({ packages: [{ ...pkg, tenureMonths: bad }] }), bad).toHaveProperty(
        "packages.0.tenureMonths",
      );
    for (const ok of ["1", "120"])
      expect(errorsOf({ packages: [{ ...pkg, tenureMonths: ok }] }), ok).toEqual({});
  });

  it("amounts are required; the “guarantee” check covers every new text field", () => {
    expect(errorsOf({ packages: [{ ...pkg, amount: "" }] })).toHaveProperty("packages.0.amount");
    expect(errorsOf({ packages: [{ ...pkg, label: "Guaranteed" }] })).toHaveProperty(
      "packages.0.label",
      GUARANTEE_MESSAGE,
    );
    for (const k of [
      "description",
      "partnerName",
      "contractWith",
      "payoutTerms",
      "exitTerms",
    ] as const)
      expect(errorsOf({ packages: [pkg], [k]: "Returns are guaranteed" }), k).toHaveProperty(
        k,
        GUARANTEE_MESSAGE,
      );
  });

  it("web address: lowercase, numbers and single hyphens", () => {
    expect(errorsOf({ packages: [pkg], slug: "sample-12-month-plan" })).toEqual({});
    for (const bad of ["Bad Slug", "a--b", "-a", "a_b"])
      expect(errorsOf({ packages: [pkg], slug: bad }), bad).toHaveProperty("slug");
  });
});

describe("publish rules", () => {
  const ready = {
    packageCount: 3,
    slug: "sample-12-month-plan",
    contractWith: "Verity Homes and Properties Ltd",
    payoutTerms: "At maturity.",
  };
  it("a complete plan has no issues", () => expect(planPublishIssues(ready)).toEqual({}));
  it("needs ≥1 package, a web address, who the agreement is with, and payout terms", () => {
    expect(
      Object.keys(
        planPublishIssues({ packageCount: 0, slug: "", contractWith: " ", payoutTerms: null }),
      ),
    ).toEqual(["packages", "slug", "contractWith", "payoutTerms"]);
  });
});

// ---- publishPlan refuses incomplete plans (after the admin check) ----
class ForbiddenError extends Error {}
const requireAdmin = vi.fn(async () => ({ userId: "user_admin" }));
vi.mock("@/lib/auth", () => ({ requireAdmin, ForbiddenError }));
vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));
vi.mock("@/lib/db/queries/invest", () => ({ PLANS_TAG: "plans", FAQS_TAG: "faqs" }));
const state = {
  id: "plana1234567",
  slug: "plan-a" as string | null,
  status: "DRAFT",
  contractWith: "Verity" as string | null,
  payoutTerms: "At maturity." as string | null,
  _count: { packages: 1 },
};
const m = {
  findPlanState: vi.fn(async () => state),
  setPlanStatus: vi.fn(async () => ({ id: "plana1234567", status: "PUBLISHED" })),
};
vi.mock("@/lib/db/mutations/plans", () => m);

describe("publishPlan", async () => {
  const { publishPlan, createPlan } = await import("@/lib/actions/plan");
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockImplementation(async () => ({ userId: "user_admin" }));
  });

  it("rejects a non-admin before reading or writing", async () => {
    requireAdmin.mockRejectedValue(new ForbiddenError());
    expect((await publishPlan("plana1234567")).ok).toBe(false);
    expect((await createPlan({ ...base, packages: [pkg] })).ok).toBe(false);
    expect(m.findPlanState).not.toHaveBeenCalled();
    expect(m.setPlanStatus).not.toHaveBeenCalled();
  });

  it("refuses a plan with no packages, listing what's missing", async () => {
    m.findPlanState.mockResolvedValueOnce({
      ...state,
      slug: null,
      payoutTerms: null,
      _count: { packages: 0 },
    });
    const res = await publishPlan("plana1234567");
    expect(res.ok).toBe(false);
    expect(!res.ok && res.fieldErrors).toEqual({
      packages: "Add at least one package before publishing",
      slug: "Add a web address before publishing",
      payoutTerms: "Add the payout terms before publishing",
    });
    expect(m.setPlanStatus).not.toHaveBeenCalled();
  });

  it("publishes a complete plan", async () => {
    expect((await publishPlan("plana1234567")).ok).toBe(true);
    expect(m.setPlanStatus).toHaveBeenCalledWith("plana1234567", "PUBLISHED");
  });
});
