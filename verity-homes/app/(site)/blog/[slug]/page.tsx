import { Suspense } from "react";
import { SlugPageFallback } from "@/components/site/slug-page-fallback";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import styles from "@/components/site/blog/article.module.css";
import { Markdown } from "@/components/site/blog/markdown";
import { AuthorBox, CategoryTag, PostShare } from "@/components/site/blog/post-sections";
import { HelpCta } from "@/components/site/help-cta";
import { PageHero } from "@/components/site/page-hero";
import { PostsSection } from "@/components/site/post-cards";
import { postJsonLd, postMetaDescription } from "@/lib/blog";
import {
  getPostBySlug,
  getPostRedirect,
  getPublishedPostSlugs,
  getRelatedPosts,
} from "@/lib/db/queries/posts";
import { getSiteSettings } from "@/lib/db/queries/settings";
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
  return pageMetadata({
    title,
    description,
    path: url,
    type: "article",
    image: post.coverUrl
      ? { url: absoluteUrl(post.coverUrl, SITE), alt: post.coverAlt || post.title }
      : null,
    article: {
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
      authors: [post.authorName],
    },
  });
}

// design/post.html: hero over the cover photo (category, title, date · reading time · author),
// the cover itself overlapping the white sheet, the Markdown body, share, author, a "talk to
// us" card, then up to 3 related posts (same category first, then the latest).
async function PostContent({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    const to = await getPostRedirect(slug);
    if (to && to !== slug) permanentRedirect(`/blog/${encodeURIComponent(to)}`);
    notFound();
  }
  const [related, settings] = await Promise.all([
    getRelatedPosts({ id: post.id, categoryId: post.category?.id ?? null }, 3),
    getSiteSettings(), // the author box's CEO bio + WhatsApp number (Unit 19a)
  ]);
  const url = postUrl(post.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(postJsonLd(post, SITE)) }}
      />
      <PageHero
        variant="post"
        overlap={Boolean(post.coverUrl)}
        kicker={post.category ? <CategoryTag name={post.category.name} /> : undefined}
        title={post.title}
        details={
          <p className={styles.meta} data-testid="post-meta">
            {post.publishedAt ? (
              <span>
                <time dateTime={post.publishedAt.toISOString()}>
                  {formatDate(post.publishedAt)}
                </time>
              </span>
            ) : null}
            <span>{post.readingMinutes} min read</span>
            <span>
              by <b>{post.authorName}</b>
            </span>
          </p>
        }
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Article" },
        ]}
        image={post.coverUrl ?? "/samples/dusk.jpg"}
      />
      <section className="sheet" aria-label="Article">
        <div className="container">
          {post.coverUrl ? (
            <div className={`${styles.cover} media`}>
              <Image
                src={post.coverUrl}
                alt={post.coverAlt || post.title}
                fill
                priority
                sizes="(max-width: 1140px) 100vw, 1080px"
              />
            </div>
          ) : null}
          <article className={styles.article}>
            <Markdown source={post.content} siteUrl={SITE} className={`prose ${styles.body}`} />
            <PostShare title={post.title} url={url} />
            <AuthorBox name={post.authorName} ceoBio={settings.ceoBio} siteUrl={SITE} />
            <HelpCta
              title="Have questions about this? Talk to Verity"
              text="Chat with us on WhatsApp, or ask for a call back."
              whatsapp={settings.whatsapp}
              whatsappText={`Hi Verity, I have a question about "${post.title}" (${url})`}
              ownerId={post.id}
              callBackHref="/contact#message"
            />
          </article>
        </div>
      </section>
      <PostsSection
        posts={related}
        id="related"
        pill="Keep reading"
        title="Related posts"
        layout="trio"
      />
    </>
  );
}

/**
 * `params` is read inside <Suspense> (Next 16 + Partial Prefetching): the route's generic App
 * Shell is tagged by the site layout's settings read, so a settings save regenerates it — and
 * awaiting params outside a boundary made that regeneration fail (500) until Unit 19a.
 * Slugs from generateStaticParams are still fully prerendered; proxy.ts still answers 308/404.
 */
export default function PostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Suspense fallback={<SlugPageFallback />}>
      <PostContent params={params} />
    </Suspense>
  );
}
