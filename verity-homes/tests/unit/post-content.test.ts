// Unit 18 pure helpers: reading time, unsafe-link detection, unreferenced-image detection,
// Markdown toolbar edits and post image paths.
import { describe, expect, it } from "vitest";
import { markdownImageSrc } from "@/lib/blog";
import { applyMarkdown, insertBlock } from "@/lib/markdown-format";
import {
  markdownImage,
  readingMinutes,
  unreferencedImages,
  unsafeLinkIn,
  wordCount,
} from "@/lib/post-content";
import {
  isPostImagePathname,
  isPostImageUrl,
  postFolder,
  postIdFromPathname,
  postImagePathname,
} from "@/lib/post-images";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("reading time (200 words a minute, minimum 1)", () => {
  it.each([
    [0, 1],
    [1, 1],
    [200, 1],
    [201, 2],
    [400, 2],
    [401, 3],
    [1000, 5],
    [1999, 10],
  ])("%i words → %i min", (n, minutes) => {
    expect(wordCount(words(n))).toBe(n);
    expect(readingMinutes(words(n))).toBe(minutes);
  });

  it("counts link text but not images, URLs or Markdown markers", () => {
    const md = [
      "## Two words",
      "",
      "**Bold** and _italic_ text. A [link text](https://example.com/a-b-c) here.",
      "",
      "![a very long alt text that should not count](https://x.public.blob.vercel-storage.com/p.webp)",
      "",
      "- one",
      "> quoted line",
      "https://bare.example.com/path",
    ].join("\n");
    // Two words / Bold and italic text / A link text here / one / quoted line
    expect(wordCount(md)).toBe(2 + 4 + 4 + 1 + 2);
  });

  it("counts words with apostrophes and hyphens once", () => {
    expect(wordCount("Lagos's well-known C-of-O isn't cheap")).toBe(5);
  });
});

describe("unsafeLinkIn", () => {
  it.each([
    "[click](javascript:alert(1))",
    "[click]( JavaScript:alert(1))",
    "[click](<javascript:alert(1)>)",
    "![img](data:image/png;base64,AAAA)",
    "[x](vbscript:msgbox(1))",
    "[x](java&#115;cript:alert(1))",
    "[x](&#x6A;avascript:alert(1))",
    "[x](javascript&colon;alert(1))",
    "[x][ref]\n\n[ref]: javascript:alert(1)",
    "<javascript:alert(1)>",
  ])("rejects %s", (md) => {
    expect(unsafeLinkIn(md)).not.toBeNull();
  });

  it.each([
    "[ok](https://example.com)",
    "[ok](/properties)",
    "[mail](mailto:a@b.co) [tel](tel:+234)",
    "[anchor](#top)",
    "Plain text that mentions javascript: in prose.",
    "![img](https://abc.public.blob.vercel-storage.com/posts/x/inline/a.webp)",
  ])("allows %s", (md) => {
    expect(unsafeLinkIn(md)).toBeNull();
  });
});

describe("unreferencedImages", () => {
  const base = "https://abc.public.blob.vercel-storage.com/e2e/posts/post12345678";
  const cover = `${base}/cover-AbC.webp`;
  const inline1 = `${base}/inline/one-XyZ.webp`;
  const inline2 = `${base}/inline/two-QrS.webp`;
  const files = [cover, inline1, inline2];

  it("keeps the cover and every image the body mentions", () => {
    expect(
      unreferencedImages(files, { coverUrl: cover, content: `Hi\n\n![One](${inline1})` }),
    ).toEqual([inline2]);
  });

  it("an image removed from the body (and an old cover) become unreferenced", () => {
    expect(unreferencedImages(files, { coverUrl: null, content: "No images any more." })).toEqual(
      files,
    );
  });

  it("a link to the file also keeps it", () => {
    expect(unreferencedImages([inline1], { coverUrl: null, content: `[see](${inline1})` })).toEqual(
      [],
    );
  });
});

describe("markdownImage", () => {
  it("builds ![alt](url) and escapes brackets in the alt text", () => {
    expect(markdownImage("  A [new]  home ", "https://x/y.webp")).toBe(
      "![A \\[new\\] home](https://x/y.webp)",
    );
  });
});

describe("Markdown toolbar", () => {
  it("bold wraps the selection, or a placeholder that stays selected", () => {
    expect(applyMarkdown("bold", { value: "a word b", start: 2, end: 6 })).toEqual({
      value: "a **word** b",
      start: 4,
      end: 8,
    });
    const r = applyMarkdown("italic", { value: "", start: 0, end: 0 });
    expect(r.value).toBe("_italic text_");
    expect(r.value.slice(r.start, r.end)).toBe("italic text");
  });

  it("link puts the selection in brackets and selects the URL", () => {
    const r = applyMarkdown("link", { value: "see docs", start: 4, end: 8 });
    expect(r.value).toBe("see [docs](https://)");
    expect(r.value.slice(r.start, r.end)).toBe("https://");
  });

  it("heading, list and quote prefix every selected line, and toggle off", () => {
    const v = "one\ntwo\nthree";
    const list = applyMarkdown("bullets", { value: v, start: 0, end: 7 });
    expect(list.value).toBe("- one\n- two\nthree");
    expect(applyMarkdown("bullets", { value: list.value, start: 0, end: 10 }).value).toBe(v);
    expect(applyMarkdown("heading", { value: v, start: 5, end: 5 }).value).toBe(
      "one\n## two\nthree",
    );
    expect(applyMarkdown("quote", { value: "", start: 0, end: 0 }).value).toBe("> Quote");
  });

  it("insertBlock puts an image on its own paragraph at the cursor", () => {
    const r = insertBlock({ value: "Before after", start: 6, end: 6 }, "![a](u)");
    expect(r.value).toBe("Before\n\n![a](u)\n\n after");
    expect(r.start).toBe("Before\n\n![a](u)".length);
    expect(insertBlock({ value: "", start: 0, end: 0 }, "![a](u)").value).toBe("![a](u)");
    expect(insertBlock({ value: "Para\n\n", start: 6, end: 6 }, "![a](u)").value).toBe(
      "Para\n\n![a](u)",
    );
  });
});

describe("post image paths", () => {
  const ID = "post12345678";

  it("covers go in posts/<id>/, body images in posts/<id>/inline/", () => {
    expect(postImagePathname("", ID, "cover", "My Cover.HEIC", "image/webp")).toBe(
      `posts/${ID}/my-cover.webp`,
    );
    expect(postImagePathname("e2e/", ID, "inline", "a.jpg", "image/jpeg")).toBe(
      `e2e/posts/${ID}/inline/a.jpg`,
    );
    expect(postFolder("e2e/", ID)).toBe(`e2e/posts/${ID}/`);
    expect(postFolder("", "../etc")).toBeNull();
  });

  it("recognises only files in the post's own folders", () => {
    expect(isPostImagePathname("", ID, `posts/${ID}/cover-AbC12.webp`)).toBe(true);
    expect(isPostImagePathname("", ID, `posts/${ID}/inline/a-Xy.jpg`)).toBe(true);
    expect(isPostImagePathname("", ID, `posts/${ID}/inline/deeper/a.jpg`)).toBe(false);
    expect(isPostImagePathname("", ID, `posts/${ID}/a.gif`)).toBe(false);
    expect(isPostImagePathname("", ID, `posts/other1234567/a.jpg`)).toBe(false);
    expect(postIdFromPathname("e2e/", `e2e/posts/${ID}/inline/a.webp`)).toBe(ID);
    expect(postIdFromPathname("", `e2e/posts/${ID}/a.webp`)).toBeNull();
    expect(postIdFromPathname("", `properties/${ID}/a.webp`)).toBeNull();
  });

  it("isPostImageUrl needs the public Blob host and the post's folder", () => {
    const ok = `https://abc.public.blob.vercel-storage.com/posts/${ID}/c-Ab.webp`;
    expect(isPostImageUrl("", ID, ok)).toBe(true);
    expect(isPostImageUrl("", "other1234567", ok)).toBe(false);
    expect(isPostImageUrl("", ID, ok.replace("https:", "http:"))).toBe(false);
    expect(isPostImageUrl("", ID, `https://evil.example/posts/${ID}/c.webp`)).toBe(false);
  });
});

describe("Blob images in Markdown (Q23)", () => {
  it("renders images from the public Blob host, like next.config remotePatterns", () => {
    const src = "https://abc123.public.blob.vercel-storage.com/posts/x/inline/a.webp";
    expect(markdownImageSrc(src)).toBe(src);
    expect(markdownImageSrc(src.replace("https:", "http:"))).toBeNull();
    // `*` is one label only, and the suffix must really be the Blob host.
    expect(markdownImageSrc("https://a.b.public.blob.vercel-storage.com/x.webp")).toBeNull();
    expect(markdownImageSrc("https://public.blob.vercel-storage.com/x.webp")).toBeNull();
    expect(
      markdownImageSrc("https://abc.public.blob.vercel-storage.com.evil.com/x.webp"),
    ).toBeNull();
  });
});
