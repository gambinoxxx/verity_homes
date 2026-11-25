import Image from "next/image";
import Link from "next/link";
import { prefetchFor } from "@/lib/nav";
import styles from "./page-hero.module.css";

export type Crumb = { label: string; href?: string };

type PageHeroProps = {
  /** The page's only <h1>. Put the gold accent word in <em>. */
  title: React.ReactNode;
  /** Breadcrumb trail; the last item is the current page (no href). */
  crumbs: readonly Crumb[];
  sub?: React.ReactNode;
  /** Decorative background photo. */
  image: string;
  /**
   * Default: the giant inner-page title. "post": the design/post.html hero (taller, smaller
   * title up to 900px wide) for prose pages and blog posts. "split": two columns on desktop
   * (stacked on phones) — kicker, title, `details` and `sub` on the left, `aside` (e.g. a price
   * card) on the right; used by /invest/[slug].
   */
  variant?: "page" | "post" | "split";
  /** Shown above the title in the "post" and "split" variants (e.g. a tag or badge). */
  kicker?: React.ReactNode;
  /** "split" and "post": lines under the title (e.g. date · reading time · author). */
  details?: React.ReactNode;
  /**
   * "post": extra room at the bottom for a cover image that overlaps the top of the white
   * sheet (the page renders the image, e.g. blog posts).
   */
  overlap?: boolean;
  /** "split": the right-hand column. */
  aside?: React.ReactNode;
  /** "split": shown under the subtitle (the landing pages' WhatsApp / call buttons). */
  after?: React.ReactNode;
};

function Crumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      <ol>
        {crumbs.map((c, i) => (
          <li key={`${i}-${c.label}`}>
            {c.href ? (
              <Link href={c.href} prefetch={prefetchFor(c.href)}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Inner-page hero (design `.page-hero`): full-bleed photo, dark overlay, giant title,
 * breadcrumb, optional subtitle on the right. Follow it with `<section className="sheet">`.
 */
export function PageHero({
  title,
  crumbs,
  sub,
  image,
  variant = "page",
  kicker,
  details,
  aside,
  after,
  overlap = false,
}: PageHeroProps) {
  const post = variant === "post";
  const background = (
    <div className={`${styles.image} media`} aria-hidden="true">
      <Image src={image} alt="" fill priority sizes="100vw" />
    </div>
  );

  if (variant === "split") {
    return (
      <section className={`${styles.hero} ${styles.split}`} aria-labelledby="page-title">
        {background}
        <div className={`container ${styles.splitInner}`}>
          <div className={styles.splitText}>
            <Crumbs crumbs={crumbs} />
            {kicker}
            <h1 className={styles.title} id="page-title">
              {title}
            </h1>
            {details}
            {sub ? <p className={styles.sub}>{sub}</p> : null}
            {after}
          </div>
          {aside ? <div className={styles.splitAside}>{aside}</div> : null}
        </div>
      </section>
    );
  }

  // A post with `details` (blog): breadcrumb on top, then kicker, title and the meta line.
  const metaFirst = post && details != null;
  return (
    <section
      className={`${styles.hero} ${post ? styles.post : ""} ${metaFirst ? styles.withDetails : ""} ${
        post && overlap ? styles.overlap : ""
      }`}
      aria-labelledby="page-title"
    >
      {background}
      <div className={`container ${styles.inner}`}>
        <div className={post ? styles.postText : undefined}>
          {metaFirst ? <Crumbs crumbs={crumbs} /> : null}
          {kicker}
          <h1 className={styles.title} id="page-title">
            {title}
          </h1>
          {metaFirst ? details : <Crumbs crumbs={crumbs} />}
        </div>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
      </div>
    </section>
  );
}
