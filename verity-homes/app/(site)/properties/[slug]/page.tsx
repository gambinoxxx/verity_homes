import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PlotOptions } from "@/components/site/property/plots";
import { Gallery } from "@/components/site/property/gallery";
import {
  AboutBlock,
  DocumentsBlock,
  EnquiryCard,
  EstateTerms,
  FactsStrip,
  FeaturesBlock,
  LocationBlock,
  MobileBar,
  PropertyHead,
  PropertyHero,
  SimilarProperties,
} from "@/components/site/property/sections";
import styles from "@/components/site/property/property.module.css";
import { env } from "@/lib/env";
import {
  getPropertyBySlug,
  getPropertyRedirect,
  getPublishedPropertySlugs,
  getSimilarProperties,
} from "@/lib/db/queries/properties";
import { getSiteSettings } from "@/lib/db/queries/settings";
import {
  absoluteUrl,
  jsonLdScript,
  metaDescription,
  propertyJsonLd,
  propertyWhatsappMessage,
} from "@/lib/property-detail";

const SITE = env.NEXT_PUBLIC_SITE_URL;
const pageUrl = (slug: string) => absoluteUrl(`/properties/${slug}`, SITE);

/**
 * Published slugs are prerendered. Cache Components needs at least one entry, so an empty
 * database returns a placeholder that resolves to notFound(). Other slugs render on first
 * request (every read below is cached with the "properties" tag).
 */
export async function generateStaticParams() {
  const slugs = await getPublishedPropertySlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) return { title: "Property not found — Verity Homes and Properties" };
  const title = `${p.seoTitle?.trim() || p.title} — Verity Homes and Properties`;
  const description = metaDescription(p);
  const url = pageUrl(p.slug);
  const cover = p.images[0];
  const images = cover
    ? [
        {
          url: absoluteUrl(cover.url, SITE),
          alt: cover.alt,
          ...(cover.width && cover.height ? { width: cover.width, height: cover.height } : {}),
        },
      ]
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Verity Homes and Properties",
      images,
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

// design/property.html, top to bottom.
export default async function PropertyPage({ params }: PageProps<"/properties/[slug]">) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    // A renamed listing keeps working: old slug → 308 to the current one.
    const to = await getPropertyRedirect(slug);
    if (to && to !== slug) permanentRedirect(`/properties/${encodeURIComponent(to)}`);
    notFound();
  }

  const [settings, similar] = await Promise.all([
    getSiteSettings(),
    // Only the two fields it needs: they form the cache key.
    getSimilarProperties({ id: property.id, listingType: property.listingType }),
  ]);
  const url = pageUrl(property.slug);
  const whatsappText = propertyWhatsappMessage(property.title, url);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(propertyJsonLd(property, SITE)) }}
      />
      <PropertyHero property={property} />
      <section className={styles.sheet} aria-label="Property details">
        <div className="container">
          <PropertyHead property={property} url={url} />
          <Gallery images={property.images} title={property.title} />
          <FactsStrip property={property} />
          {property.plots.length ? (
            <PlotOptions
              propertyId={property.id}
              title={property.title}
              url={url}
              plots={property.plots}
            />
          ) : null}
          <EstateTerms property={property} />
          <div className={styles.layout}>
            <div>
              <AboutBlock property={property} />
              <FeaturesBlock property={property} />
              <DocumentsBlock property={property} />
              <LocationBlock property={property} />
            </div>
            <EnquiryCard
              property={property}
              whatsappNumber={settings.whatsapp}
              whatsappText={whatsappText}
            />
          </div>
        </div>
      </section>
      <SimilarProperties items={similar} />
      <MobileBar
        propertyId={property.id}
        whatsappNumber={settings.whatsapp}
        whatsappText={whatsappText}
      />
    </>
  );
}
