import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogBrowser, BlogLoading } from "@/components/site/blog/blog-browser";
import { PageHero } from "@/components/site/page-hero";

const SUB = "Guides and updates for buyers, tenants and investors.";

export const metadata: Metadata = {
  title: "Blog — Verity Homes and Properties",
  description: `${SUB} Practical articles on buying, renting and investing in Lagos property.`,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Blog — Verity Homes and Properties",
    description: SUB,
    siteName: "Verity Homes and Properties",
  },
};

// design/blog.html: page hero, then the sheet with category pills, post rows and sidebar.
export default function BlogPage({ searchParams }: PageProps<"/blog">) {
  return (
    <>
      <PageHero
        title={
          <>
            Our <em>blog</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
        sub={SUB}
        image="/samples/aerial.jpg"
      />
      <section className="sheet" aria-label="Articles">
        <div className="container">
          <Suspense fallback={<BlogLoading />}>
            <BlogBrowser searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}
