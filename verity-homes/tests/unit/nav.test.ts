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
    expect(prefetchFor("/blog")).toBeUndefined(); // built in Unit 11
    expect(prefetchFor("/blog?q=1")).toBeUndefined();
    expect(prefetchFor("/about")).toBeUndefined(); // built in Unit 10
    expect(prefetchFor("/about?x=1")).toBeUndefined();
    expect(prefetchFor("/privacy")).toBeUndefined(); // built in Unit 10
    expect(prefetchFor("/invest")).toBeUndefined(); // built in Unit 9
    expect(prefetchFor("/invest#start")).toBeUndefined();
    expect(prefetchFor("/contact#message")).toBeUndefined(); // built in Unit 8
    expect(prefetchFor("/properties")).toBeUndefined(); // built in Unit 5
    expect(prefetchFor("/properties?type=rent")).toBeUndefined();
    expect(prefetchFor("/blog/sample-post")).toBeUndefined();
    expect(prefetchFor("/")).toBeUndefined();
    expect(prefetchFor("/#services")).toBeUndefined();
  });

  it("still turns prefetch off for routes listed as unbuilt (exact and /* children)", () => {
    const unbuilt = ["/careers", "/news/*"];
    expect(prefetchFor("/careers", unbuilt)).toBe(false);
    expect(prefetchFor("/careers?x=1#a", unbuilt)).toBe(false);
    expect(prefetchFor("/news/some-item", unbuilt)).toBe(false);
    expect(prefetchFor("/careers-old", unbuilt)).toBeUndefined();
  });

  it("prefetches detail pages (properties: Unit 6, blog posts: Unit 11)", () => {
    expect(prefetchFor("/properties/sample-duplex")).toBeUndefined();
    expect(prefetchFor("/properties/sample-duplex#enquire")).toBeUndefined();
    expect(prefetchFor("/blog/sample-post")).toBeUndefined();
  });
});
