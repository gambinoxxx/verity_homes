// Unit 21 step 6b: the landing-page copy in lib/landing-pages.ts follows the editing rules,
// and every page is in the sitemap exactly once.
import { describe, expect, it } from "vitest";
import {
  LANDING_LINKS,
  LANDING_PAGES,
  LANDING_PATHS,
  WHY_VERITY,
  landingPagesForPost,
  landingWordCount,
  type LandingPage,
} from "@/lib/landing-pages";
import { STATIC_SITEMAP_PATHS, sitemapEntries } from "@/lib/sitemap";

/** Every piece of text on a page (values only, not the object keys). */
function texts(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(texts).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(texts).join(" ");
  return "";
}

const EXPECTED = [
  "/buy-house-lagos",
  "/land-for-sale-lagos",
  "/property-investment-lagos",
  "/rent-apartment-lagos",
  "/property-management-lagos",
];

describe("landing pages", () => {
  it("are the five agreed pages, with unique paths", () => {
    expect([...LANDING_PATHS]).toEqual(EXPECTED);
    expect(LANDING_LINKS.map((l) => l.href)).toEqual(EXPECTED);
  });

  describe.each(LANDING_PAGES.map((p): [string, LandingPage] => [p.path, p]))("%s", (_path, page) => {
    it("title ≤ 60 and description ≤ 155, both with the search phrase", () => {
      expect(page.title.length).toBeLessThanOrEqual(60);
      expect(page.description.length).toBeLessThanOrEqual(155);
      const phrase = page.phrase.toLowerCase();
      expect(page.title.toLowerCase()).toContain(phrase);
      expect(page.description.toLowerCase()).toContain(phrase);
      expect(page.h1.toLowerCase()).toContain(phrase);
    });

    it("has 500–800 words of copy, 3 why-points and 4–5 FAQs", () => {
      const words = landingWordCount(page);
      expect(words).toBeGreaterThanOrEqual(500);
      expect(words).toBeLessThanOrEqual(800);
      expect((page.why ?? WHY_VERITY).length).toBe(3);
      expect(page.faqs.length).toBeGreaterThanOrEqual(4);
      expect(page.faqs.length).toBeLessThanOrEqual(5);
    });

    it("states no prices or statistics", () => {
      const rest: Partial<LandingPage> = { ...page };
      delete rest.path;
      // Step numbers in headings ("1. Set a realistic budget") are the only digits allowed.
      const text = texts(rest).replace(/\b\d\. /g, "");
      expect(text).not.toMatch(/₦|\bN\d|%|per ?cent|\d/i);
    });
  });

  it("the investment page promises no returns (Q54)", () => {
    const page = LANDING_PAGES.find((p) => p.path === "/property-investment-lagos")!;
    const text = texts(page).toLowerCase();
    expect(text).not.toMatch(
      /guarantee(d)? (return|profit|income)|returns? of|roi|yield|interest rate|double your/,
    );
    expect(text).not.toMatch(/\d/);
  });

  it("blog posts link back to their landing pages", () => {
    expect(landingPagesForPost("buying-land-lagos-checks").map((p) => p.path)).toContain(
      "/land-for-sale-lagos",
    );
    expect(landingPagesForPost("buying-house-lagos-guide").map((p) => p.path)).toContain(
      "/buy-house-lagos",
    );
    expect(landingPagesForPost("no-such-post")).toEqual([]);
  });

  it("each page is in the sitemap exactly once", () => {
    const urls = sitemapEntries(STATIC_SITEMAP_PATHS, [], "https://www.verityhomes.ng").map(
      (e) => e.url,
    );
    for (const path of EXPECTED) {
      expect(urls.filter((u) => u === `https://www.verityhomes.ng${path}`)).toHaveLength(1);
    }
  });
});
