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
};

/**
 * Inner-page hero (design `.page-hero`): full-bleed photo, dark overlay, giant title,
 * breadcrumb, optional subtitle on the right. Follow it with `<section className="sheet">`.
 */
export function PageHero({ title, crumbs, sub, image }: PageHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="page-title">
      <div className={`${styles.image} media`} aria-hidden="true">
        <Image src={image} alt="" fill priority sizes="100vw" />
      </div>
      <div className={`container ${styles.inner}`}>
        <div>
          <h1 className={styles.title} id="page-title">
            {title}
          </h1>
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
        </div>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
      </div>
    </section>
  );
}
