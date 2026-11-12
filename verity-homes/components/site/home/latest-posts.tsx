import Image from "next/image";
import { getLatestPosts, type PostSummary } from "@/lib/db/queries/posts";
import { formatDate } from "@/lib/format";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon } from "../icons";
import { PillTicker } from "../pill-ticker";
import { Reveal, RevealLink } from "../reveal";
import styles from "./latest-posts.module.css";

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
            alt={post.coverAlt ?? ""}
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

/** "Insights for buyers & investors": the 3 newest published posts (1 big + 2 small). */
export async function LatestPosts() {
  const posts = await getLatestPosts(3);
  if (posts.length === 0) return null;
  return (
    <section className={`sec ${styles.blog}`} id="blog" aria-labelledby="b-h">
      <div className="container">
        <div className="sec-head">
          <div>
            <Reveal as="span">
              <PillTicker label="Articles & insights" />
            </Reveal>
            <Reveal as="h2" className="h2" delay={1} id="b-h">
              Insights for buyers &amp; investors
            </Reveal>
          </div>
          <RevealLink className="link-arrow" delay={2} href="/blog" prefetch={prefetchFor("/blog")}>
            All articles <ArrowIcon className={styles.arrow} />
          </RevealLink>
        </div>
        <div className={styles.posts}>
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} big={i === 0} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
