import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Markdown } from "@/components/site/blog/markdown";
import { AuthorBox, CategoryTag, PostShare } from "@/components/site/blog/post-sections";
import { PageHero } from "@/components/site/page-hero";
import { PostsSection } from "@/components/site/post-cards";
import { postJsonLd, postMetaDescription } from "@/lib/blog";
import {
  getPostBySlug,
  getPostRedirect,
  getPublishedPostSlugs,
  getRelatedPosts,
} from "@/lib/db/queries/posts";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { absoluteUrl, jsonLdScript } from "@/lib/property-detail";

const SITE = env.NEXT_PUBLIC_SITE_URL;
const postUrl = (slug: string) => absoluteUrl(`/blog/${slug}`, SITE);

/**
 * Published slugs are prerendered. Cache Components needs at least one entry, so an empty
 * database returns a placeholder that resolves to notFound(). proxy.ts answers unknown/draft
 * slugs with a real 404 and renamed ones with a 308 before this page streams.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedPostSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article not found — Verity Homes and Properties" };
  const title = `${post.seoTitle?.trim() || post.title} — Verity Homes and Properties`;
  const description = postMetaDescription(post);
  const url = postUrl(post.slug);
  const images = post.coverUrl
    ? [{ url: absoluteUrl(post.coverUrl, SITE), alt: post.coverAlt || post.title }]
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Verity Homes and Properties",
      images,
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
      authors: [post.authorName],
    },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  };
}

// design/post.html: hero over the cover photo (category, title, date · reading time), Markdown
// body, share, author, then two related posts. The design shows the cover only as the hero.
export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    const to = await getPostRedirect(slug);
    if (to && to !== slug) permanentRedirect(`/blog/${encodeURIComponent(to)}`);
    notFound();
  }
  const related = await getRelatedPosts({ id: post.id, categoryId: post.category?.id ?? null });
  const url = postUrl(post.slug);
  const minutes = `${post.readingMinutes} min read`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(postJsonLd(post, SITE)) }}
      />
      <PageHero
        variant="post"
        kicker={post.category ? <CategoryTag name={post.category.name} /> : undefined}
        title={post.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          {
            label: post.publishedAt ? `${formatDate(post.publishedAt)} · ${minutes}` : minutes,
          },
        ]}
        image={post.coverUrl ?? "/samples/dusk.jpg"}
      />
      <section className="sheet" aria-label="Article">
        <article className="article container">
          <Markdown source={post.content} siteUrl={SITE} />
          <PostShare title={post.title} url={url} />
          <AuthorBox name={post.authorName} />
        </article>
      </section>
      <PostsSection
        posts={related}
        id="related"
        pill="Keep reading"
        title="More articles"
        layout="pair"
      />
    </>
  );
}
