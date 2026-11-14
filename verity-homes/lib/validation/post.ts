// Blog post editor schema (Unit 18), shared by the admin form (zodResolver) and lib/actions/post.ts.
// Input = the form's strings; output = what the database gets (nulls, computed reading time).
import { z } from "zod";
import { MIN_PUBLISH_WORDS, readingMinutes, unsafeLinkIn, wordCount } from "@/lib/post-content";

export const POST_LIMITS = {
  title: 120,
  slug: 80,
  excerpt: 300,
  /** Recommended excerpt length (shown by the counter; Google cuts descriptions near here). */
  excerptRecommended: 160,
  author: 80,
  coverAlt: 200,
  content: 50_000,
  seoTitle: 70,
  seoDescription: 160,
  category: 40,
} as const;

export const DEFAULT_AUTHOR = "Esther Ezenagu";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_RE = /^[a-z0-9]{8,40}$/;

export const UNSAFE_LINK_MESSAGE =
  "Links and images can't use javascript:, vbscript: or data: addresses. Use a normal https:// link.";

const text = (max: number, tooLong: string) => z.string().trim().max(max, tooLong);

export const postSchema = z
  .object({
    title: text(POST_LIMITS.title, "Keep the title under 120 characters").pipe(
      z.string().min(1, "Add a title"),
    ),
    slug: text(POST_LIMITS.slug, "Keep the web address under 80 characters").refine(
      (v) => v === "" || SLUG_RE.test(v),
      "Use lowercase letters, numbers and single hyphens",
    ),
    categoryId: z
      .string()
      .trim()
      .refine((v) => v === "" || ID_RE.test(v), "Choose a category"),
    excerpt: text(POST_LIMITS.excerpt, "Keep the excerpt under 300 characters"),
    authorName: text(POST_LIMITS.author, "Keep the author name under 80 characters").pipe(
      z.string().min(1, "Add the author's name"),
    ),
    coverUrl: z
      .string()
      .trim()
      .max(500)
      .refine(
        (v) => v === "" || v.startsWith("/samples/") || /^https:\/\/[^\s]+$/.test(v),
        "That cover image address doesn't look right",
      ),
    coverPathname: z.string().trim().max(300),
    coverAlt: text(POST_LIMITS.coverAlt, "Keep the cover description under 200 characters"),
    content: z
      .string()
      .max(POST_LIMITS.content, "The article is too long (50,000 characters at most)")
      .refine((v) => unsafeLinkIn(v) === null, UNSAFE_LINK_MESSAGE),
    seoTitle: text(POST_LIMITS.seoTitle, "Keep the SEO title under 70 characters"),
    seoDescription: text(
      POST_LIMITS.seoDescription,
      "Keep the SEO description under 160 characters",
    ),
  })
  .transform((v) => ({
    title: v.title,
    slug: v.slug,
    categoryId: v.categoryId === "" ? null : v.categoryId,
    excerpt: v.excerpt,
    authorName: v.authorName,
    coverUrl: v.coverUrl === "" ? null : v.coverUrl,
    coverPathname: v.coverUrl === "" || v.coverPathname === "" ? null : v.coverPathname,
    coverAlt: v.coverAlt,
    content: v.content,
    readingMinutes: readingMinutes(v.content),
    seoTitle: v.seoTitle === "" ? null : v.seoTitle,
    seoDescription: v.seoDescription === "" ? null : v.seoDescription,
  }));

export type PostFormValues = z.input<typeof postSchema>;
export type PostData = z.output<typeof postSchema>;

export type PostPublishField =
  "title" | "slug" | "categoryId" | "excerpt" | "cover" | "coverAlt" | "content";

/**
 * What a post needs before it can go live: title, web address, category, excerpt, a cover with
 * alt text, and a body of at least 100 words. Empty → ready.
 */
export function postPublishIssues(v: {
  title: string | null;
  slug: string | null;
  categoryId: string | null;
  excerpt: string | null;
  coverUrl: string | null;
  coverAlt: string | null;
  content: string;
}): Partial<Record<PostPublishField, string>> {
  const issues: Partial<Record<PostPublishField, string>> = {};
  if (!v.title?.trim()) issues.title = "Add a title before publishing";
  if (!v.slug?.trim()) issues.slug = "Add a web address before publishing";
  if (!v.categoryId) issues.categoryId = "Choose a category before publishing";
  if (!v.excerpt?.trim()) issues.excerpt = "Add an excerpt before publishing";
  if (!v.coverUrl) issues.cover = "Add a cover image before publishing";
  else if (!v.coverAlt?.trim()) issues.coverAlt = "Describe the cover image before publishing";
  const words = wordCount(v.content);
  if (words < MIN_PUBLISH_WORDS)
    issues.content = `Write at least ${MIN_PUBLISH_WORDS} words before publishing (now ${words})`;
  return issues;
}

export const EMPTY_POST: PostFormValues = {
  title: "",
  slug: "",
  categoryId: "",
  excerpt: "",
  authorName: DEFAULT_AUTHOR,
  coverUrl: "",
  coverPathname: "",
  coverAlt: "",
  content: "",
  seoTitle: "",
  seoDescription: "",
};

/** Field labels in form order (error summary). */
export const POST_FIELD_LABEL: Record<string, string> = {
  title: "Title",
  slug: "Web address",
  categoryId: "Category",
  excerpt: "Excerpt",
  authorName: "Author",
  cover: "Cover image",
  coverUrl: "Cover image",
  coverAlt: "Cover alt text",
  content: "Article",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
};

export const postIdSchema = z.string().trim().regex(ID_RE);

// ---- Categories (/admin/categories) ----

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Add a category name")
    .max(POST_LIMITS.category, "Keep the name under 40 characters")
    .refine((v) => /[\p{L}\p{N}]/u.test(v), "Use letters or numbers"),
});

export type CategoryInput = z.input<typeof categorySchema>;
