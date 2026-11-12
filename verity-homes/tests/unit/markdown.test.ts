// Safety of the blog Markdown renderer (components/site/blog/markdown.tsx): raw HTML is never
// rendered, dangerous URLs are stripped, external links are isolated, unknown image hosts are
// skipped, and the usual Markdown (headings, lists, quotes, GFM) still renders.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/site/blog/markdown";

const SITE = "https://verityhomes.com.ng";
const render = (source: string) =>
  renderToStaticMarkup(createElement(Markdown, { source, siteUrl: SITE }));

describe("Markdown renderer — safety", () => {
  it("drops raw HTML: <script>, inline tags, event handlers", () => {
    const html = render(
      [
        "Before.",
        "",
        '<script>window.x = "XSS-MARKER"</script>',
        "",
        '<div class="raw">RAW-DIV</div>',
        "",
        '<img src="x" onerror="alert(1)">',
        "",
        'Inline <b>bold</b> and <span onclick="alert(1)">span</span>.',
      ].join("\n"),
    );
    expect(html).toContain("Before.");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("XSS-MARKER");
    expect(html).not.toContain("RAW-DIV");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<b>");
    // The only <div> is the renderer's own .prose wrapper; the raw one is gone.
    expect(html.match(/<div/g)).toHaveLength(1);
    expect(html).not.toContain('class="raw"');
  });

  it("strips javascript: and data: link targets", () => {
    const html = render("[a](javascript:alert(1)) [b](data:text/html,<script>alert(1)</script>)");
    expect(html).not.toMatch(/href="javascript:/i);
    expect(html).not.toMatch(/href="data:/i);
  });

  it("external links open in a new tab with rel=noopener noreferrer", () => {
    const html = render("[guide](https://example.com/guide)");
    expect(html).toContain(
      '<a href="https://example.com/guide" target="_blank" rel="noopener noreferrer">guide</a>',
    );
  });

  it("same-site links stay in the tab (no target, no rel)", () => {
    const html = render("[plans](/invest) and [home](https://verityhomes.com.ng/properties)");
    expect(html).toContain('href="/invest"');
    expect(html).toContain('href="https://verityhomes.com.ng/properties"');
    expect(html).not.toContain("target=");
  });

  it("skips images from unknown hosts and protocol-relative URLs", () => {
    const html = render("![remote](https://evil.example/x.png) ![pr](//evil.example/y.png)");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("evil.example");
  });

  it("renders same-site images through next/image with their alt text", () => {
    const html = render("![A family home at dusk](/samples/dusk.jpg)");
    expect(html).toContain("<img");
    expect(html).toContain('alt="A family home at dusk"');
    expect(html).toContain("dusk.jpg");
  });
});

describe("Markdown renderer — formatting", () => {
  it("renders headings, lists, quotes, emphasis and GFM tables", () => {
    const html = render(
      [
        "# Title in body",
        "",
        "## Section",
        "",
        "Some **bold** text.",
        "",
        "> A pull quote.",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "",
        "| a | b |",
        "| - | - |",
        "| 1 | 2 |",
      ].join("\n"),
    );
    // "#" is demoted: the page's only <h1> is the post title.
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2>Title in body</h2>");
    expect(html).toContain("<h2>Section</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toMatch(/<blockquote>\s*<p>A pull quote\.<\/p>\s*<\/blockquote>/);
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<table>");
    expect(html.startsWith('<div class="prose">')).toBe(true);
  });
});
