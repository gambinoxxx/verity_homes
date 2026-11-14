// lib/validation/post.ts (Unit 18): the schema the editor and the actions share, and the
// publish rules.
import { describe, expect, it } from "vitest";
import { EMPTY_POST, categorySchema, postPublishIssues, postSchema } from "@/lib/validation/post";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const COVER = "https://abc.public.blob.vercel-storage.com/posts/post12345678/c-Ab.webp";

const ready = {
  title: "[SAMPLE] A post",
  slug: "sample-a-post",
  categoryId: "cat123456789",
  excerpt: "A short summary.",
  coverUrl: COVER,
  coverAlt: "A duplex at dusk",
  content: words(120),
};

const errorsOf = (input: unknown) => {
  const r = postSchema.safeParse(input);
  return r.success
    ? {}
    : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]));
};

describe("postSchema", () => {
  it("accepts a draft with only a title, and fills in nulls + reading time", () => {
    const r = postSchema.parse({ ...EMPTY_POST, title: "  Draft  ", content: words(450) });
    expect(r).toMatchObject({
      title: "Draft",
      slug: "",
      categoryId: null,
      coverUrl: null,
      coverPathname: null,
      authorName: "Esther Ezenagu",
      seoTitle: null,
      seoDescription: null,
      readingMinutes: 3,
    });
  });

  it("needs a title and an author", () => {
    expect(errorsOf({ ...EMPTY_POST })).toMatchObject({ title: "Add a title" });
    expect(errorsOf({ ...EMPTY_POST, title: "T", authorName: " " })).toMatchObject({
      authorName: "Add the author's name",
    });
  });

  it("slug format: lowercase words with single hyphens, ≤ 80", () => {
    for (const bad of ["Upper-Case", "two--hyphens", "-lead", "trail-", "under_score", "a b"]) {
      expect(errorsOf({ ...EMPTY_POST, title: "T", slug: bad }), bad).toHaveProperty("slug");
    }
    expect(errorsOf({ ...EMPTY_POST, title: "T", slug: "a".repeat(81) })).toHaveProperty("slug");
    expect(errorsOf({ ...EMPTY_POST, title: "T", slug: "ok-slug-2" })).toEqual({});
  });

  it("excerpt: up to 300 characters (160 is only a recommendation)", () => {
    expect(errorsOf({ ...EMPTY_POST, title: "T", excerpt: "x".repeat(200) })).toEqual({});
    expect(errorsOf({ ...EMPTY_POST, title: "T", excerpt: "x".repeat(301) })).toMatchObject({
      excerpt: "Keep the excerpt under 300 characters",
    });
  });

  it('rejects "javascript:" (and other script) links in the body', () => {
    for (const content of [
      "[x](javascript:alert(1))",
      "[x](JAVASCRIPT:alert(1))",
      "[x](java&#115;cript:alert(1))",
      "![x](data:image/svg+xml;base64,AAA)",
    ]) {
      expect(errorsOf({ ...EMPTY_POST, title: "T", content }), content).toHaveProperty("content");
    }
    expect(errorsOf({ ...EMPTY_POST, title: "T", content: "[x](https://ok.example)" })).toEqual({});
  });

  it("SEO limits, cover alt limit and a bad category id", () => {
    expect(
      errorsOf({
        ...EMPTY_POST,
        title: "T",
        seoTitle: "x".repeat(71),
        seoDescription: "x".repeat(161),
        coverAlt: "x".repeat(201),
        categoryId: "Robert'); DROP",
      }),
    ).toMatchObject({
      seoTitle: expect.any(String),
      seoDescription: expect.any(String),
      coverAlt: expect.any(String),
      categoryId: "Choose a category",
    });
  });

  it("cover address must be https (or a /samples/ seed image)", () => {
    expect(errorsOf({ ...EMPTY_POST, title: "T", coverUrl: "javascript:alert(1)" })).toHaveProperty(
      "coverUrl",
    );
    expect(errorsOf({ ...EMPTY_POST, title: "T", coverUrl: "/samples/dusk.jpg" })).toEqual({});
    expect(
      postSchema.parse({ ...EMPTY_POST, title: "T", coverUrl: "", coverPathname: "p" }),
    ).toMatchObject({ coverUrl: null, coverPathname: null });
  });
});

describe("postPublishIssues", () => {
  it("a complete post is ready", () => {
    expect(postPublishIssues(ready)).toEqual({});
  });

  it("needs title, slug, category, excerpt, cover and ~100 words", () => {
    expect(
      postPublishIssues({
        title: " ",
        slug: "",
        categoryId: null,
        excerpt: "",
        coverUrl: null,
        coverAlt: "",
        content: words(99),
      }),
    ).toEqual({
      title: "Add a title before publishing",
      slug: "Add a web address before publishing",
      categoryId: "Choose a category before publishing",
      excerpt: "Add an excerpt before publishing",
      cover: "Add a cover image before publishing",
      content: "Write at least 100 words before publishing (now 99)",
    });
    expect(postPublishIssues({ ...ready, content: words(100) })).toEqual({});
  });

  it("alt text is required for the cover before publishing", () => {
    expect(postPublishIssues({ ...ready, coverAlt: "  " })).toEqual({
      coverAlt: "Describe the cover image before publishing",
    });
  });

  it("image syntax and URLs don't count towards the 100 words", () => {
    const padded = `${words(90)}\n\n![${words(50)}](${COVER})\n\nhttps://example.com/a/b`;
    expect(postPublishIssues({ ...ready, content: padded })).toHaveProperty("content");
  });
});

describe("categorySchema", () => {
  it("needs 1–40 characters with a letter or number", () => {
    expect(categorySchema.safeParse({ name: " Market updates " }).success).toBe(true);
    expect(categorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "---" }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "x".repeat(41) }).success).toBe(false);
  });
});
