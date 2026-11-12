// Everything on /blog that depends on the URL (?category, ?q, ?page). Rendered inside
// <Suspense> (searchParams is request-time data under Cache Components). Pills, pager and the
// search form are plain links / a GET form, so the list works without JavaScript too.
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import {
  getLatestPosts,
  getPostCategories,
  listPosts,
  type CategoryCount,
  type PostSummary,
} from "@/lib/db/queries/posts";
import { formatDate } from "@/lib/format";
import { pageNumbers } from "@/lib/property-list";
import {
  blogHref,
  parseBlogFilters,
  type BlogFilters,
  type SearchParamsInput,
} from "@/lib/validation/blog-filters";
import { ArrowIcon, SearchIcon } from "../icons";
import { Reveal, RevealLink } from "../reveal";
import styles from "./blog.module.css";

export async function BlogBrowser({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const filters = parseBlogFilters(await searchParams);
  const [result, categories, recent] = await Promise.all([
    listPosts(filters),
    getPostCategories(),
    getLatestPosts(3),
  ]);
  return (
    <>
      <CategoryPills filters={filters} categories={categories} />
      <div className={styles.layout} id="posts">
        <div>
          {result.items.length > 0 ? (
            result.items.map((p) => <PostRow key={p.id} post={p} />)
          ) : (
            <EmptyState />
          )}
          {result.pageCount > 1 ? (
            <Pager filters={filters} page={result.page} pageCount={result.pageCount} />
          ) : null}
        </div>
        <Sidebar filters={filters} categories={categories} recent={recent} />
      </div>
    </>
  );
}

/** Suspense fallback while the list streams in. */
export function BlogLoading() {
  return (
    <div className={styles.loading} role="status">
      Loading articles…
    </div>
  );
}

function CategoryPills({
  filters,
  categories,
}: {
  filters: BlogFilters;
  categories: CategoryCount[];
}) {
  // A pill keeps the search text but always goes back to page 1.
  const href = (category?: string) => blogHref({ q: filters.q, category });
  return (
    <Reveal as="div" className={`pills ${styles.pills}`}>
      <nav aria-label="Categories" className="contents">
        <Link href={href()} scroll={false} aria-current={!filters.category ? "page" : undefined}>
          All posts
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={href(c.slug)}
            scroll={false}
            aria-current={filters.category === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>
    </Reveal>
  );
}

function PostRow({ post }: { post: PostSummary }) {
  return (
    <RevealLink className={styles.row} href={`/blog/${post.slug}`} data-post-row>
      <div className={`media ${styles.rowMedia}`}>
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.coverAlt}
            fill
            sizes="(max-width: 1020px) 100vw, 700px"
          />
        ) : null}
      </div>
      <div className={styles.meta}>
        {post.category ? <span className={styles.cat}>{post.category.name}</span> : null}
        <i aria-hidden="true" />
        {post.publishedAt ? (
          <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
        ) : null}
      </div>
      <h2>{post.title}</h2>
      {post.excerpt ? <p>{post.excerpt}</p> : null}
    </RevealLink>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty} role="status">
      <h2>No articles found</h2>
      <p>Try another search or category.</p>
      <Link className="btn btn-navy" href="/blog">
        See all articles
      </Link>
    </div>
  );
}

function Pager({
  filters,
  page,
  pageCount,
}: {
  filters: BlogFilters;
  page: number;
  pageCount: number;
}) {
  const href = (n: number) => blogHref({ ...filters, page: n }, "#posts");
  return (
    <nav className={styles.pager} aria-label="Pagination">
      {page > 1 ? (
        <Link className={styles.prev} href={href(page - 1)} aria-label="Previous page">
          <ArrowIcon />
        </Link>
      ) : null}
      {pageNumbers(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} aria-label="Next page">
          <ArrowIcon />
        </Link>
      ) : null}
    </nav>
  );
}

function Sidebar({
  filters,
  categories,
  recent,
}: {
  filters: BlogFilters;
  categories: CategoryCount[];
  recent: PostSummary[];
}) {
  return (
    <aside className={styles.side} aria-label="Blog sidebar">
      <div>
        <h2 className={`${styles.sideHead} ${styles.searchHead}`}>Search</h2>
        {/* next/form: a GET form that navigates client-side (plain GET without JS). */}
        <Form action="/blog" className={styles.search} role="search" scroll={false}>
          <label htmlFor="blog-search" className="sr-only">
            Search articles
          </label>
          <input
            id="blog-search"
            type="search"
            name="q"
            placeholder="Search articles"
            defaultValue={filters.q ?? ""}
            maxLength={100}
            key={filters.q ?? ""}
          />
          {filters.category ? (
            <input type="hidden" name="category" value={filters.category} />
          ) : null}
          <button type="submit" aria-label="Search">
            <SearchIcon />
          </button>
        </Form>
      </div>
      {recent.length > 0 ? (
        <div>
          <h2 className={styles.sideHead}>Recent posts</h2>
          <ul className={styles.links}>
            {recent.map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {categories.length > 0 ? (
        <div>
          <h2 className={styles.sideHead}>Categories</h2>
          <ul className={styles.links}>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={blogHref({ category: c.slug })}
                  scroll={false}
                  aria-current={filters.category === c.slug ? "page" : undefined}
                >
                  {c.name}{" "}
                  <small>
                    {c.count}
                    <span className="sr-only"> {c.count === 1 ? "article" : "articles"}</span>
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="cta-card">
        <h2>Thinking of investing?</h2>
        <p>See how our real estate plans work.</p>
        <Link className="btn btn-gold" href="/invest">
          Explore plans
        </Link>
      </div>
    </aside>
  );
}
