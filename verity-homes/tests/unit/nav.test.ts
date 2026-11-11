import { describe, expect, it } from "vitest";
import { MAIN_NAV, isActiveLink, prefetchFor } from "@/lib/nav";

describe("isActiveLink", () => {
  it("matches the exact route and its children", () => {
    expect(isActiveLink("/properties", "/properties")).toBe(true);
    expect(isActiveLink("/properties/sample-duplex", "/properties")).toBe(true);
  });

  it("does not match a route that only shares a prefix", () => {
    expect(isActiveLink("/properties-old", "/properties")).toBe(false);
    expect(isActiveLink("/blogger", "/blog")).toBe(false);
  });

  it("never marks hash links or home as active", () => {
    expect(isActiveLink("/", "/#services")).toBe(false);
    expect(isActiveLink("/", "/")).toBe(false);
    expect(isActiveLink(null, "/about")).toBe(false);
  });

  it("has the six main links in design order", () => {
    expect(MAIN_NAV.map((l) => l.href)).toEqual([
      "/properties",
      "/invest",
      "/#services",
      "/about",
      "/blog",
      "/contact",
    ]);
  });
});

describe("prefetchFor", () => {
  it("turns prefetch off only for routes that have no page yet", () => {
    expect(prefetchFor("/properties")).toBe(false);
    expect(prefetchFor("/")).toBeUndefined();
    expect(prefetchFor("/#services")).toBeUndefined();
  });
});
