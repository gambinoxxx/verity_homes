import Image from "next/image";
import type { PostSummary } from "@/lib/db/queries/posts";
import { formatDate } from "@/lib/format";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "./icons";
import { PillTicker } from "./pill-ticker";
import { Reveal, RevealLink } from "./reveal";
import styles from "./post-cards.module.css";

const DELAYS = [0, 1, 2] as const;

function PostCard({ post, big, index }: { post: PostSummary; big: boolean; index: number }) {
  const href = `/blog/${post.slug}`;
  return (
    <RevealLink
      className={`${styles.post} ${big ? styles.big : ""}`}
      delay={DELAYS[index] ?? 0}
      href={href}
      prefetch={prefetchFor(href)}
    >
      <div className={`media ${styles.media}`}>
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.coverAlt}
            fill
            sizes={big ? "(max-width: 900px) 100vw, 700px" : "(max-width: 900px) 100vw, 540px"}
          />
        ) : null}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          {post.category ? <span>{post.category.name}</span> : null}
          {post.publishedAt ? (
            <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
          ) : null}
        </div>
        <h3>{post.title}</h3>
        {big ? (
          <span className={styles.more}>
            Read article <ArrowIcon />
          </span>
        ) : null}
      </div>
    </RevealLink>
  );
}

type PostsSectionProps = {
  posts: readonly PostSummary[];
  /** Section id + heading id (e.g. "blog" → id="blog", heading "blog-h"). */
  id: string;
  pill: string;
  title: React.ReactNode;
  /** "featured": 1 big + 2 small (home). "pair": two equal cards (post page). */
  layout: "featured" | "pair";
};

/**
 * Grey `.sec.blog` section with a pill, heading, "All articles" link and post cards. Home
 * "Insights for buyers & investors" and the post page's "More articles". Hidden if no posts.
 */
export function PostsSection({ posts, id, pill, title, layout }: PostsSectionProps) {
  if (posts.length === 0) return null;
  const headingId = `${id}-h`;
  return (
    <section className={`sec ${styles.blog}`} id={id} aria-labelledby={headingId}>
      <div className="container">
        <div className="sec-head">
          <div>
            <Reveal as="span">
              <PillTicker label={pill} />
            </Reveal>
            <Reveal as="h2" className="h2" delay={1} id={headingId}>
              {title}
            </Reveal>
          </div>
          <RevealLink className="link-arrow" delay={2} href="/blog" prefetch={prefetchFor("/blog")}>
            All articles <ArrowIcon className={styles.arrow} />
          </RevealLink>
        </div>
        <div className={`${styles.posts} ${layout === "pair" ? styles.pair : ""}`}>
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} big={layout === "featured" && i === 0} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
