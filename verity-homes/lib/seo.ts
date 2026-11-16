// SEO helpers (Unit 20): one metadata shape for every public page, and the Organization JSON-LD
// in the root layout. Pure (no env, no DB), so they are unit-tested; callers pass the site URL.
// Relative URLs (canonical, og:url, images) resolve against `metadataBase` (app/layout.tsx).
import type { Metadata } from "next";

export const SITE_NAME = "Verity Homes and Properties";

/** Generated from brand/logo/verity-logo-stacked-on-dark.svg (navy, gold frame). */
export const DEFAULT_OG_IMAGE = {
  url: "/og/verity-homes-1200x630.png",
  width: 1200,
  height: 630,
  alt: "Verity Homes and Properties",
} as const;

/** Square logo for structured data (copied from brand/web-icons/icon-512.png). */
export const LOGO_PATH = "/og/verity-logo-512.png";

export type OgImage = { url: string; alt: string; width?: number; height?: number };

type PageMetaInput = {
  title: string;
  description: string;
  /** Path ("/about") or absolute URL; becomes the canonical and og:url. */
  path: string;
  /** Cover photo (property, post); the default brand image when missing. */
  image?: OgImage | null;
  /** og:description when it should differ from the meta description. */
  ogDescription?: string;
  type?: "website" | "article";
  /** Extra Open Graph fields for articles (publishedTime, authors). */
  article?: { publishedTime?: string; authors?: string[] };
};

/**
 * Title, description, canonical, Open Graph and Twitter for a public page. Every page gets an
 * og:image: its cover photo, else the brand image (a page's own `openGraph` replaces the root
 * layout's, so the default is set here rather than inherited).
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  ogDescription,
  type = "website",
  article,
}: PageMetaInput): Metadata {
  const og = image ?? DEFAULT_OG_IMAGE;
  const images = [
    {
      url: og.url,
      alt: og.alt,
      ...(og.width && og.height ? { width: og.width, height: og.height } : {}),
    },
  ];
  const desc = ogDescription ?? description;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: SITE_NAME,
      locale: "en_NG",
      title,
      description: desc,
      images,
      ...(type === "article" && article ? article : {}),
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [og.url] },
  };
}

export type OrganizationSettings = {
  companyName: string;
  rcNumber: string;
  officeArea: string;
  phone: string | null;
  email: string | null;
  socials: Record<string, string | null>;
};

/**
 * Organization JSON-LD (root layout): name, CAC RC number as the identifier, logo and the office
 * AREA only (never the street address). Phone, email and social profiles only when set in site
 * settings — nothing is invented.
 */
export function organizationJsonLd(s: OrganizationSettings, siteUrl: string) {
  const url = new URL("/", siteUrl).toString();
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${url}#organization`,
    name: s.companyName,
    alternateName: SITE_NAME,
    url,
    logo: new URL(LOGO_PATH, siteUrl).toString(),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "CAC RC number",
      value: s.rcNumber,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: s.officeArea,
      addressCountry: "NG",
    },
  };
  if (s.phone?.trim()) ld.telephone = s.phone.trim();
  if (s.email?.trim()) ld.email = s.email.trim();
  const sameAs = Object.values(s.socials).filter((v): v is string => Boolean(v?.trim()));
  if (sameAs.length) ld.sameAs = sameAs;
  return ld;
}
