import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AreaPageView } from "@/components/site/area/area-page";
import { SlugPageFallback } from "@/components/site/slug-page-fallback";
import { areaCopy } from "@/lib/areas";
import { getAreaGroups, getAreaPage } from "@/lib/db/queries/properties";
import { pageMetadata } from "@/lib/seo";

/**
 * /properties/in/[area] (Unit 21 step 6): every area with ≥ 1 published property. proxy.ts
 * answers 404 for any other area before this renders. Cache Components needs at least one
 * static param, so an empty database returns a placeholder that resolves to notFound().
 */
export async function generateStaticParams() {
  const groups = await getAreaGroups();
  return groups.length > 0 ? groups.map((g) => ({ area: g.slug })) : [{ area: "__none__" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/properties/in/[area]">): Promise<Metadata> {
  const { area } = await params;
  const page = await getAreaPage(area);
  if (!page) return {};
  const copy = areaCopy(page.group);
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: `/properties/in/${page.group.slug}`,
  });
}

async function AreaContent({ params }: { params: PageProps<"/properties/in/[area]">["params"] }) {
  const { area } = await params;
  const page = await getAreaPage(area);
  if (!page) notFound();
  const others = (await getAreaGroups()).filter((g) => g.slug !== page.group.slug);
  return <AreaPageView group={page.group} items={page.items} others={others} />;
}

// params are read inside <Suspense>, like the other [slug] pages (see app/(site)/properties/[slug]).
export default function AreaPage({ params }: PageProps<"/properties/in/[area]">) {
  return (
    <Suspense fallback={<SlugPageFallback />}>
      <AreaContent params={params} />
    </Suspense>
  );
}
