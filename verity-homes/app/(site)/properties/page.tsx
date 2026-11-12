import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/site/page-hero";
import {
  PropertiesBrowser,
  PropertiesLoading,
} from "@/components/site/properties/properties-browser";
import { propertiesListTitle } from "@/lib/property-list";
import { parsePropertyFilters } from "@/lib/validation/property-filters";

const SUB =
  "Homes, apartments and land for sale and rent across Lagos — every listing checked before it goes live.";

export async function generateMetadata({
  searchParams,
}: PageProps<"/properties">): Promise<Metadata> {
  const filters = parsePropertyFilters(await searchParams);
  const heading = propertiesListTitle(filters);
  const title = `${heading} — Verity Homes and Properties`;
  return {
    title,
    description: `${heading}. ${SUB}`,
    alternates: { canonical: "/properties" },
    openGraph: {
      type: "website",
      title,
      description: SUB,
      siteName: "Verity Homes and Properties",
    },
  };
}

// design/properties.html: page hero, then the sheet with pills, sidebar and results.
export default function PropertiesPage({ searchParams }: PageProps<"/properties">) {
  return (
    <>
      <PageHero
        title={
          <>
            Our <em>properties</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Properties" }]}
        sub={SUB}
        image="/samples/villa.jpg"
      />
      <section className="sheet subtle" aria-label="Property listings">
        <div className="container">
          <Suspense fallback={<PropertiesLoading />}>
            <PropertiesBrowser searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
