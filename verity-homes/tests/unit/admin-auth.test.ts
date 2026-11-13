// Admin role decisions (lib/auth/roles.ts) and the admin sidebar helpers (lib/admin-nav.ts).
import { describe, expect, it } from "vitest";
import { ADMIN_NAV, greetingFor, isActiveAdminLink } from "@/lib/admin-nav";
import { isAdminPath, isAdminRole, isPublicAdminPath, roleFromClaims } from "@/lib/auth/roles";

describe("roleFromClaims", () => {
  it("reads metadata.role when the session token carries metadata", () => {
    expect(roleFromClaims({ metadata: { role: "admin" } })).toEqual({ known: true, role: "admin" });
    expect(roleFromClaims({ metadata: { role: "editor" } })).toEqual({
      known: true,
      role: "editor",
    });
  });

  it("treats metadata without a role as 'no role' (known)", () => {
    expect(roleFromClaims({ metadata: {} })).toEqual({ known: true, role: null });
    expect(roleFromClaims({ metadata: null })).toEqual({ known: true, role: null });
    expect(roleFromClaims({ metadata: { role: 1 } })).toEqual({ known: true, role: null });
  });

  it("reports 'unknown' when the token has no metadata claim (look the user up)", () => {
    expect(roleFromClaims({ sub: "user_1" })).toEqual({ known: false });
    expect(roleFromClaims(null)).toEqual({ known: false });
    expect(roleFromClaims(undefined)).toEqual({ known: false });
  });
});

describe("isAdminRole", () => {
  it("only the exact 'admin' role passes", () => {
    expect(isAdminRole("admin")).toBe(true);
    for (const r of ["Admin", "ADMIN", "admin ", "editor", "", null, undefined, true])
      expect(isAdminRole(r)).toBe(false);
  });
});

describe("admin paths", () => {
  it("recognises admin paths, not look-alikes", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/properties/new")).toBe(true);
    expect(isAdminPath("/administrator")).toBe(false);
    expect(isAdminPath("/about")).toBe(false);
  });

  it("only sign-in (and its sub-steps) and no-access are open", () => {
    expect(isPublicAdminPath("/admin/sign-in")).toBe(true);
    expect(isPublicAdminPath("/admin/sign-in/factor-one")).toBe(true);
    expect(isPublicAdminPath("/admin/no-access")).toBe(true);
    expect(isPublicAdminPath("/admin")).toBe(false);
    expect(isPublicAdminPath("/admin/sign-in-old")).toBe(false);
    expect(isPublicAdminPath("/admin/no-access/x")).toBe(false);
  });
});

describe("admin sidebar", () => {
  it("lists the design's sections in order", () => {
    expect(ADMIN_NAV.flatMap((g) => g.items.map((i) => i.label))).toEqual([
      "Dashboard",
      "Properties",
      "Investment plans",
      "Blog posts",
      "Testimonials",
      "Partners",
      "Enquiries",
      "Site settings",
    ]);
  });

  it("Dashboard is active only on /admin; sections include their children", () => {
    expect(isActiveAdminLink("/admin", "/admin")).toBe(true);
    expect(isActiveAdminLink("/admin/properties", "/admin")).toBe(false);
    expect(isActiveAdminLink("/admin/properties/new", "/admin/properties")).toBe(true);
    expect(isActiveAdminLink("/admin/properties-old", "/admin/properties")).toBe(false);
    expect(isActiveAdminLink(null, "/admin")).toBe(false);
  });

  it("greets by Lagos time (UTC+1)", () => {
    expect(greetingFor(new Date("2026-11-12T08:00:00Z"))).toBe("Good morning"); // 09:00
    expect(greetingFor(new Date("2026-11-12T11:00:00Z"))).toBe("Good afternoon"); // 12:00
    expect(greetingFor(new Date("2026-11-12T16:30:00Z"))).toBe("Good evening"); // 17:30
    expect(greetingFor(new Date("2026-11-12T22:59:00Z"))).toBe("Good evening"); // 23:59
    expect(greetingFor(new Date("2026-11-12T23:00:00Z"))).toBe("Good morning"); // 00:00
  });
});
