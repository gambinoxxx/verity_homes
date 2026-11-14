// Blog post helpers: share links, meta description, Article JSON-LD, and the rules the
// Markdown renderer uses for links and images. Pure functions (unit-tested).
import { absoluteUrl } from "@/lib/property-detail";
import { whatsappShareLink } from "@/lib/whatsapp";

/** WhatsApp (title + URL), email (subject = title, body = URL). Native share is a button. */
export function postShareLinks(title: string, url: string) {
  return {
    whatsapp: whatsappShareLink(`${title} ${url}`),
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  };
}

const META_MAX = 155;

/** SEO description: the admin's own, else the excerpt, else a plain summary. */
export function postMetaDescription(p: {
  seoDescription: string | null;
  excerpt: string;
  title: string;
}): string {
  const text = (
    p.seoDescription?.trim() ||
    p.excerpt.trim() ||
    `${p.title} — Verity Homes and Properties blog.`
  ).replace(/\s+/g, " ");
  return text.length <= META_MAX ? text : `${text.slice(0, META_MAX - 1).trimEnd()}…`;
}

export function postJsonLd(
  p: {
    slug: string;
    title: string;
    excerpt: string;
    coverUrl: string | null;
    authorName: string;
    publishedAt: Date | null;
    updatedAt: Date;
  },
  siteUrl: string,
): Record<string, unknown> {
  const url = absoluteUrl(`/blog/${p.slug}`, siteUrl);
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.title,
    url,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: p.authorName },
    publisher: { "@type": "Organization", name: "Verity Homes and Properties" },
    dateModified: p.updatedAt.toISOString(),
  };
  if (p.excerpt) ld.description = p.excerpt;
  if (p.publishedAt) ld.datePublished = p.publishedAt.toISOString();
  if (p.coverUrl) ld.image = absoluteUrl(p.coverUrl, siteUrl);
  return ld;
}

/**
 * Hosts next/image may load in Markdown bodies. Must match `images.remotePatterns` in
 * next.config.ts: the Vercel Blob public host (Unit 18, Open question 23), where the post
 * editor's "Insert image" uploads go. "*." matches exactly one subdomain label, like
 * remotePatterns' `*` hostname wildcard.
 */
export const MARKDOWN_IMAGE_HOSTS: readonly string[] = ["*.public.blob.vercel-storage.com"];

function hostAllowed(hostname: string, hosts: readonly string[]): boolean {
  return hosts.some((h) => {
    if (!h.startsWith("*.")) return hostname === h;
    const suffix = h.slice(1); // ".public.blob.vercel-storage.com"
    const label = hostname.slice(0, -suffix.length);
    return hostname.endsWith(suffix) && /^[a-z0-9-]+$/i.test(label);
  });
}

/** The src to render for a Markdown image, or null to skip it (unknown host, bad URL). */
export function markdownImageSrc(
  src: string | undefined | null,
  hosts: readonly string[] = MARKDOWN_IMAGE_HOSTS,
): string | null {
  if (!src) return null;
  if (src.startsWith("/") && !src.startsWith("//")) return src; // same-site file
  try {
    const u = new URL(src);
    return u.protocol === "https:" && hostAllowed(u.hostname, hosts) ? src : null;
  } catch {
    return null;
  }
}

export type MarkdownLinkKind = "internal" | "external" | "plain";

/**
 * How a Markdown link is rendered: "internal" (same-site path → next/link), "external"
 * (other http(s) site → new tab, rel="noopener noreferrer"), "plain" (#anchor, mailto:, tel:).
 */
export function markdownLinkKind(href: string, siteUrl: string): MarkdownLinkKind {
  if (href.startsWith("/") && !href.startsWith("//")) return "internal";
  if (href.startsWith("#") || /^(mailto|tel):/i.test(href)) return "plain";
  try {
    const u = new URL(href);
    if (u.host === new URL(siteUrl).host) return "plain";
  } catch {
    // relative or odd URLs: treat as external so they never get the site's trust
  }
  return "external";
}
