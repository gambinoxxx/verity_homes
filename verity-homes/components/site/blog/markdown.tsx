// Post body renderer: Markdown (GFM) → React elements, styled by the global `.prose`.
// Safety: raw HTML in the source is dropped (skipHtml) — never rendered, never parsed into
// elements; react-markdown's default urlTransform strips javascript:/data: URLs; external links
// open in a new tab with rel="noopener noreferrer"; images render through next/image only from
// known hosts (lib/blog.ts) and are skipped otherwise.
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownImageSrc, markdownLinkKind } from "@/lib/blog";

function components(siteUrl: string): Components {
  return {
    // The page already has its one <h1> (the post title): demote Markdown "#" headings.
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children }) => {
      if (!href) return <>{children}</>;
      const kind = markdownLinkKind(href, siteUrl);
      if (kind === "internal") return <Link href={href}>{children}</Link>;
      if (kind === "external")
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      return <a href={href}>{children}</a>;
    },
    img: ({ src, alt }) => {
      const safe = markdownImageSrc(typeof src === "string" ? src : null);
      if (!safe) return null;
      const img = (
        <Image
          src={safe}
          alt={alt ?? ""}
          width={1200}
          height={800}
          sizes="(max-width: 860px) 100vw, 780px"
          className="prose-img"
        />
      );
      // Caption from the alt text. Spans, not <figure>: Markdown puts images inside a <p>.
      // The caption repeats the alt, so screen readers hear it once (from the alt).
      if (!alt?.trim()) return img;
      return (
        <span className="prose-figure">
          {img}
          <span className="prose-caption" aria-hidden="true">
            {alt}
          </span>
        </span>
      );
    },
  };
}

/**
 * `className` defaults to the article's `.prose`; owner-written site text (CEO bio, company
 * story — Unit 19a) passes its own so it keeps the section's type styles. Same safety rules.
 */
export function Markdown({
  source,
  siteUrl,
  className = "prose",
}: {
  source: string;
  siteUrl: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components(siteUrl)}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
