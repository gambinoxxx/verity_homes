// /blog URL params, share links, Article JSON-LD and meta description.
import { describe, expect, it } from "vitest";
import {
  markdownImageSrc,
  markdownLinkKind,
  postJsonLd,
  postMetaDescription,
  postShareLinks,
} from "@/lib/blog";
import { blogHref, parseBlogFilters } from "@/lib/validation/blog-filters";
import { whatsappShareLink } from "@/lib/whatsapp";

describe("parseBlogFilters", () => {
  it("reads category, q and page", () => {
    expect(parseBlogFilters({ category: "buying-guide", q: " lease ", page: "2" })).toEqual({
      category: "buying-guide",
      q: "lease",
      page: 2,
    });
  });

  it("drops bad values without throwing, keeping the valid ones", () => {
    expect(parseBlogFilters({ category: "../etc", q: "x".repeat(500), page: "-1" })).toEqual({});
    expect(parseBlogFilters({ category: "renting", page: "abc" })).toEqual({ category: "renting" });
    expect(parseBlogFilters({ page: "99999999" })).toEqual({});
    expect(parseBlogFilters({ q: ["first", "second"] })).toEqual({ q: "first" });
    expect(parseBlogFilters({ q: "   " })).toEqual({});
  });

  it("normalises: page 1 and uppercase categories", () => {
    expect(parseBlogFilters({ page: "1", category: "Renting" })).toEqual({ category: "renting" });
  });
});

describe("blogHref", () => {
  it("builds stable URLs and leaves out defaults", () => {
    expect(blogHref({})).toBe("/blog");
    expect(blogHref({ page: 1 })).toBe("/blog");
    expect(blogHref({ category: "renting", q: "lease fees", page: 2 }, "#posts")).toBe(
      "/blog?category=renting&q=lease+fees&page=2#posts",
    );
  });
});

describe("share links", () => {
  const url = "https://verityhomes.com.ng/blog/sample-tenant-checklist-lagos";
  const title = "A tenant's checklist & tips";

  it("WhatsApp shares the title + URL through wa.me", () => {
    expect(whatsappShareLink("Hi there")).toBe("https://wa.me/?text=Hi%20there");
    expect(postShareLinks(title, url).whatsapp).toBe(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    );
  });

  it("email uses the title as the subject and the URL as the body", () => {
    expect(postShareLinks(title, url).email).toBe(
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    );
  });
});

describe("Markdown link and image rules", () => {
  const site = "https://verityhomes.com.ng";
  it("classifies links", () => {
    expect(markdownLinkKind("/invest", site)).toBe("internal");
    expect(markdownLinkKind("//evil.example", site)).toBe("external");
    expect(markdownLinkKind("https://example.com", site)).toBe("external");
    expect(markdownLinkKind("https://verityhomes.com.ng/blog", site)).toBe("plain");
    expect(markdownLinkKind("#section", site)).toBe("plain");
    expect(markdownLinkKind("mailto:a@b.co", site)).toBe("plain");
  });

  it("allows only same-site images until a host is added", () => {
    expect(markdownImageSrc("/samples/dusk.jpg")).toBe("/samples/dusk.jpg");
    expect(markdownImageSrc("//cdn.example/x.png")).toBeNull();
    expect(markdownImageSrc("https://cdn.example/x.png")).toBeNull();
    expect(markdownImageSrc("javascript:alert(1)")).toBeNull();
    expect(markdownImageSrc("")).toBeNull();
  });
});

describe("postJsonLd / postMetaDescription", () => {
  const post = {
    slug: "a-post",
    title: "A post",
    excerpt: "Short summary.",
    coverUrl: "/samples/dusk.jpg",
    authorName: "Esther Ezenagu",
    publishedAt: new Date("2026-11-01T09:00:00Z"),
    updatedAt: new Date("2026-11-02T09:00:00Z"),
  };

  it("Article with headline, datePublished, author name and absolute image", () => {
    const ld = postJsonLd(post, "https://verityhomes.com.ng");
    expect(ld).toMatchObject({
      "@type": "Article",
      headline: "A post",
      datePublished: "2026-11-01T09:00:00.000Z",
      author: { "@type": "Person", name: "Esther Ezenagu" },
      image: "https://verityhomes.com.ng/samples/dusk.jpg",
      url: "https://verityhomes.com.ng/blog/a-post",
    });
  });

  it("omits datePublished and image when missing", () => {
    const ld = postJsonLd({ ...post, publishedAt: null, coverUrl: null }, "https://x.ng");
    expect(ld).not.toHaveProperty("datePublished");
    expect(ld).not.toHaveProperty("image");
  });

  it("description: SEO text, else excerpt, else a summary; trimmed to 155 chars", () => {
    expect(postMetaDescription({ seoDescription: "SEO", excerpt: "Ex", title: "T" })).toBe("SEO");
    expect(postMetaDescription({ seoDescription: null, excerpt: "Ex", title: "T" })).toBe("Ex");
    expect(postMetaDescription({ seoDescription: " ", excerpt: "", title: "T" })).toContain("T");
    const long = postMetaDescription({ seoDescription: "a ".repeat(200), excerpt: "", title: "T" });
    expect(long.length).toBeLessThanOrEqual(155);
    expect(long.endsWith("…")).toBe(true);
  });
});
