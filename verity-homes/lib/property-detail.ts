// Pure helpers for the property detail page (/properties/[slug]): facts strip, description
// paragraphs, enquiry interest, WhatsApp text, meta description and JSON-LD.
// Privacy: nothing here accepts or emits the private `address` — location is area + city only.
import type { PropertyDetail } from "@/lib/db/queries/properties";
import { LISTING_LABEL, TITLE_LABEL, formatMonthYear } from "@/lib/format";

export type FactKey = "beds" | "baths" | "size" | "parking" | "title" | "completion";
export type Fact = { key: FactKey; label: string; value: string };

type FactSource = Pick<
  PropertyDetail,
  "bedrooms" | "bathrooms" | "sizeSqm" | "parkingSpaces" | "titleDocument" | "completionDate"
> & { sizeLabel?: string | null };

const num = (n: number) => n.toLocaleString("en-NG");

/** Only the facts the listing actually has, in the design's order. */
export function propertyFacts(p: FactSource): Fact[] {
  const facts: Fact[] = [];
  if (p.bedrooms != null) facts.push({ key: "beds", label: "Bedrooms", value: num(p.bedrooms) });
  if (p.bathrooms != null)
    facts.push({ key: "baths", label: "Bathrooms", value: num(p.bathrooms) });
  // Unit 17b: an estate's plot range ("300–1,000 sqm") wins over a single size.
  if (p.sizeLabel) facts.push({ key: "size", label: "Plot sizes", value: p.sizeLabel });
  else if (p.sizeSqm != null)
    facts.push({ key: "size", label: "Size", value: `${num(p.sizeSqm)} sqm` });
  if (p.parkingSpaces != null && p.parkingSpaces > 0)
    facts.push({
      key: "parking",
      label: "Parking",
      value: `${num(p.parkingSpaces)} ${p.parkingSpaces === 1 ? "car" : "cars"}`,
    });
  if (p.titleDocument)
    facts.push({ key: "title", label: "Title", value: TITLE_LABEL[p.titleDocument] });
  if (p.completionDate)
    facts.push({
      key: "completion",
      label: "Completion",
      value: formatMonthYear(p.completionDate),
    });
  return facts;
}

/** Admin-written description → paragraphs (split on blank lines; single newlines kept as spaces). */
export function descriptionParagraphs(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Interest sent with a property enquiry (EnquiryInterest), from the listing type. */
export function enquiryInterest(
  listingType: PropertyDetail["listingType"],
): "BUYING" | "RENTING" | "LAND" {
  if (listingType === "RENT") return "RENTING";
  if (listingType === "LAND") return "LAND";
  return "BUYING";
}

export const propertyWhatsappMessage = (title: string, url: string) =>
  `Hi Verity, I'm interested in ${title} (${url})`;

/** Absolute URL for a path or URL, against the public site URL. */
export const absoluteUrl = (pathOrUrl: string, siteUrl: string) =>
  new URL(pathOrUrl, siteUrl).toString();

const META_MAX = 155;

/** SEO description: the admin's own, else the start of the description, else a plain summary. */
export function metaDescription(
  p: Pick<PropertyDetail, "seoDescription" | "description" | "listingType" | "area" | "city">,
): string {
  if (p.seoDescription?.trim()) return p.seoDescription.trim();
  const first = descriptionParagraphs(p.description)[0];
  if (first) {
    if (first.length <= META_MAX) return first;
    const cut = first.slice(0, META_MAX - 1);
    return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : cut.length)}…`;
  }
  return `${LISTING_LABEL[p.listingType]} in ${p.area}, ${p.city}. Photos, documents and location.`;
}

type JsonLdSource = Pick<
  PropertyDetail,
  | "slug"
  | "title"
  | "description"
  | "seoDescription"
  | "listingType"
  | "area"
  | "city"
  | "images"
  | "publishedAt"
  | "priceKobo"
  | "priceOnRequest"
>;

/**
 * schema.org RealEstateListing. Location is area + city only (never the address); the price is
 * included only when it is public (not "price on request").
 */
export function propertyJsonLd(p: JsonLdSource, siteUrl: string): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: p.title,
    description: metaDescription(p),
    url: absoluteUrl(`/properties/${p.slug}`, siteUrl),
    contentLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: p.area,
        addressRegion: p.city,
        addressCountry: "NG",
      },
    },
  };
  if (p.images.length > 0) ld.image = p.images.map((i) => absoluteUrl(i.url, siteUrl));
  if (p.publishedAt) ld.datePosted = p.publishedAt.toISOString();
  if (!p.priceOnRequest && p.priceKobo != null) {
    ld.offers = { "@type": "Offer", price: p.priceKobo / 100, priceCurrency: "NGN" };
  }
  return ld;
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in content. */
export const jsonLdScript = (ld: Record<string, unknown>) =>
  JSON.stringify(ld).replace(/</g, "\\u003c");
