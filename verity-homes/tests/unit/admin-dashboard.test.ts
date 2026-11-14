// Admin dashboard (Unit 13): pure helpers, fixture renders (empty state, checklist), and the
// admin queries against the Neon test branch — each must call requireAdmin() first.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUILT_ADMIN_ROUTES,
  QUICK_ACTIONS,
  enquiryHref,
  enquirySubject,
  isAdminRouteBuilt,
  setupChecklist,
  type SetupStatus,
} from "@/lib/admin-dashboard";
import { timeAgo } from "@/lib/format";
import { assertTestDatabase } from "./helpers/test-db";

const requireAdmin = vi.fn(async () => ({ userId: "user_test" }));
vi.mock("@/lib/auth", () => ({ requireAdmin }));

describe("timeAgo", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  const ago = (ms: number) => timeAgo(new Date(now.getTime() - ms), now);
  it("reads naturally from seconds to a week, then shows the date", () => {
    expect(ago(20_000)).toBe("Just now");
    expect(ago(5 * 60_000)).toBe("5 min ago");
    expect(ago(3 * 3_600_000)).toBe("3 h ago");
    expect(ago(30 * 3_600_000)).toBe("Yesterday");
    expect(ago(4 * 86_400_000)).toBe("4 days ago");
    expect(ago(8 * 86_400_000)).toMatch(/4 Nov 2026/);
  });
});

describe("enquiry rows", () => {
  it("names the property, else the plan, after the interest", () => {
    expect(
      enquirySubject({ interest: "BUYING", propertyTitle: "Duplex", planName: "Starter" }),
    ).toBe("Buying · Duplex");
    expect(
      enquirySubject({ interest: "INVESTING", propertyTitle: null, planName: "Starter" }),
    ).toBe("Investing · Plan: Starter");
    expect(enquirySubject({ interest: "LAND", propertyTitle: null, planName: null })).toBe("Land");
  });

  it("links to the enquiry in the inbox", () => {
    expect(enquiryHref("ck1 2")).toBe("/admin/enquiries?id=ck1%202");
  });
});

describe("built admin routes", () => {
  it("dashboard + properties are built so far; public pages always count as built", () => {
    expect([...BUILT_ADMIN_ROUTES]).toEqual([
      "/admin",
      "/admin/properties",
      "/admin/properties/new",
      "/admin/enquiries",
      "/admin/plans",
      "/admin/plans/new",
      "/admin/faqs",
      "/admin/posts",
      "/admin/posts/new",
      "/admin/categories",
    ]);
    expect(isAdminRouteBuilt("/admin")).toBe(true);
    expect(isAdminRouteBuilt("/admin/properties/new")).toBe(true);
    expect(isAdminRouteBuilt("/admin/posts/new")).toBe(true); // Unit 18
    expect(isAdminRouteBuilt("/admin/testimonials")).toBe(false);
    expect(isAdminRouteBuilt("/admin/settings?tab=contact")).toBe(false);
    expect(isAdminRouteBuilt("/privacy")).toBe(true);
    expect(isAdminRouteBuilt("/admin/plans", new Set(["/admin/plans"]))).toBe(true);
  });

  it("quick actions point at the routes later units build", () => {
    expect(QUICK_ACTIONS.map((a) => [a.label, a.href])).toEqual([
      ["Add a property", "/admin/properties/new"],
      ["Write a blog post", "/admin/posts/new"],
      ["Edit investment plans", "/admin/plans"],
      ["Update contact details", "/admin/settings"],
    ]);
  });
});

describe("setupChecklist", () => {
  const done: SetupStatus = {
    whatsappSet: true,
    emailSet: true,
    realPublishedProperties: 1,
    privacyReviewed: true,
  };
  const keys = (s: SetupStatus) => setupChecklist(s).map((i) => i.key);

  it("is empty when everything is set (the card hides)", () => {
    expect(keys(done)).toEqual([]);
  });

  it("lists each missing item, in order", () => {
    expect(
      keys({
        whatsappSet: false,
        emailSet: false,
        realPublishedProperties: 0,
        privacyReviewed: false,
      }),
    ).toEqual(["whatsapp", "email", "property", "privacy"]);
    expect(keys({ ...done, emailSet: false })).toEqual(["email"]);
    expect(keys({ ...done, realPublishedProperties: 0 })).toEqual(["property"]);
    expect(keys({ ...done, privacyReviewed: false })).toEqual(["privacy"]);
  });

  it("links each item to where it's fixed", () => {
    const items = setupChecklist({
      whatsappSet: false,
      emailSet: false,
      realPublishedProperties: 0,
      privacyReviewed: false,
    });
    expect(items.map((i) => i.href)).toEqual([
      "/admin/settings",
      "/admin/settings",
      "/admin/properties/new",
      "/privacy",
    ]);
    expect(items.find((i) => i.key === "privacy")?.hint).toMatch(/Q39/);
  });
});

describe("dashboard sections (fixture renders)", async () => {
  const { LatestEnquiries, SetupChecklist, EMPTY_ENQUIRIES } =
    await import("@/components/admin/dashboard/dashboard");
  const now = new Date("2026-11-12T12:00:00Z");

  it("latest enquiries: empty state", () => {
    const html = renderToStaticMarkup(createElement(LatestEnquiries, { items: [], now }));
    expect(html).toContain(EMPTY_ENQUIRIES.replace("'", "&#x27;"));
    expect(html).not.toContain("View all");
  });

  it("latest enquiries: rows link to the inbox, with badge and time", () => {
    const html = renderToStaticMarkup(
      createElement(LatestEnquiries, {
        now,
        items: [
          {
            id: "e1",
            name: "Ada",
            interest: "BUYING",
            status: "NEW",
            propertyTitle: "Duplex",
            planName: null,
            createdAt: new Date("2026-11-12T10:00:00Z"),
          },
        ],
      }),
    );
    expect(html).toContain('href="/admin/enquiries?id=e1"');
    expect(html).toContain("Buying · Duplex");
    expect(html).toContain(">New<");
    expect(html).toContain("2 h ago");
  });

  it("setup checklist renders nothing when complete, items otherwise", () => {
    expect(renderToStaticMarkup(createElement(SetupChecklist, { items: [] }))).toBe("");
    const html = renderToStaticMarkup(
      createElement(SetupChecklist, {
        items: setupChecklist({
          whatsappSet: true,
          emailSet: false,
          realPublishedProperties: 1,
          privacyReviewed: false,
        }),
      }),
    );
    expect(html).toContain('data-item="email"');
    expect(html).toContain('data-item="privacy"');
    expect(html).not.toContain('data-item="whatsapp"');
    expect(html).toContain('href="/privacy"'); // built (public) → a link
    expect(html).toContain("Coming soon"); // /admin/settings not built yet
  });
});

describe("admin queries (test branch)", async () => {
  assertTestDatabase();
  const q = await import("@/lib/db/queries/admin");
  const { db } = await import("@/lib/db/client");

  beforeEach(() => requireAdmin.mockClear());

  it("every query calls requireAdmin() and stops if it throws", async () => {
    for (const fn of [
      q.getDashboardStats,
      q.getNewEnquiryCount,
      () => q.getLatestEnquiries(5),
      q.getSetupStatus,
    ]) {
      requireAdmin.mockClear();
      await fn();
      expect(requireAdmin).toHaveBeenCalledTimes(1);
      requireAdmin.mockRejectedValueOnce(new Error("Forbidden"));
      await expect(fn()).rejects.toThrow("Forbidden");
    }
  });

  it("stats match direct counts", async () => {
    // Other test files write enquiries to the same branch in parallel: re-read until both agree.
    await vi.waitFor(
      async () => {
        const stats = await q.getDashboardStats();
        expect(stats).toEqual({
          newEnquiries: await db.enquiry.count({ where: { status: "NEW" } }),
          publishedProperties: await db.property.count({ where: { status: "PUBLISHED" } }),
          featuredProperties: await db.property.count({
            where: { status: "PUBLISHED", featured: true },
          }),
          draftProperties: await db.property.count({ where: { status: "DRAFT" } }),
          publishedPlans: await db.investmentPlan.count({ where: { status: "PUBLISHED" } }),
        });
      },
      { timeout: 20_000, interval: 500 },
    );
  });

  it("latest enquiries: at most 5, newest first", async () => {
    const rows = await q.getLatestEnquiries(5);
    expect(rows.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(rows[i]!.createdAt.getTime());
    }
  });
});
