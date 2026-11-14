// Blog post body helpers (Unit 18): word count + reading time, unsafe link detection and which
// uploaded images a post still uses. Pure functions, shared by the editor, the Zod schema and the
// actions (unit-tested in tests/unit/post-content.test.ts).

export const WORDS_PER_MINUTE = 200;
/** A post needs at least this many words in its body to be published. */
export const MIN_PUBLISH_WORDS = 100;

/**
 * Words a reader reads: image syntax and bare URLs don't count, link text does, Markdown
 * markers (#, *, >, -) are ignored.
 */
export function wordCount(markdown: string): number {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/^\s{0,3}\[[^\]]+\]:\s*\S+.*$/gm, " ") // reference definitions
    .replace(/<[^>]*>/g, " ") // autolinks / raw HTML (never rendered)
    .replace(/\bhttps?:\/\/\S+/g, " ");
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
}

/** Minutes at 200 words a minute, rounded up, minimum 1. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.ceil(wordCount(markdown) / WORDS_PER_MINUTE));
}

const BAD_SCHEME = /^(javascript|vbscript|data):/;

/** Decodes the entity tricks browsers accept in a scheme (&#106; &#x6a; &colon; &Tab;). */
function normaliseDestination(raw: string): string {
  return raw
    .replace(/&#x([0-9a-f]+);?/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&(tab|newline);/gi, "")
    .replace(/[\u0000- \u007f-\u009f]/g, "")
    .toLowerCase();
}

/**
 * The first link or image address that uses javascript:, vbscript: or data:, or null.
 * The renderer strips these anyway (react-markdown's urlTransform); this tells the admin.
 */
export function unsafeLinkIn(markdown: string): string | null {
  const destinations: string[] = [];
  for (const m of markdown.matchAll(/\]\(\s*<?([^)>\s]*)/g)) destinations.push(m[1] ?? "");
  for (const m of markdown.matchAll(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm))
    destinations.push(m[1] ?? "");
  for (const m of markdown.matchAll(/<([a-z][a-z0-9+.-]*:[^>\s]*)>/gi))
    destinations.push(m[1] ?? "");
  return destinations.find((d) => BAD_SCHEME.test(normaliseDestination(d))) ?? null;
}

/**
 * Uploaded files in a post's folder that the post no longer uses: not the cover and not
 * mentioned anywhere in the body. (Any mention counts — a link to the file keeps it too.)
 */
export function unreferencedImages(
  files: readonly string[],
  post: { coverUrl: string | null; content: string },
): string[] {
  return files.filter((url) => url !== post.coverUrl && !post.content.includes(url));
}

/** Markdown for an inline image; brackets in the alt text are escaped. */
export function markdownImage(alt: string, url: string): string {
  const safeAlt = alt
    .replace(/\s+/g, " ")
    .trim()
    .replace(/([[\]\\])/g, "\\$1");
  return `![${safeAlt}](${url})`;
}
