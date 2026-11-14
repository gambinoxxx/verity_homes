// Blog post images in Vercel Blob (Unit 18): pure path helpers shared by the editor, the upload
// route and the actions. Covers go in `<prefix>posts/<postId>/`, body images in
// `<prefix>posts/<postId>/inline/`. `prefix` is "" in production and "e2e/" in Playwright runs.
import { photoBaseName, photoExt } from "@/lib/property-photos";

export type PostImageKind = "cover" | "inline";

const ID_RE = /^[a-z0-9]{8,40}$/;
const FILE_RE = /^[A-Za-z0-9_-]+\.(jpg|webp|png)$/;

/** Everything a post has uploaded lives under this folder (null for a malformed id). */
export function postFolder(prefix: string, postId: string): string | null {
  return ID_RE.test(postId) ? `${prefix}posts/${postId}/` : null;
}

/** Upload pathname for a cover or a body image. Blob adds a random suffix before the extension. */
export function postImagePathname(
  prefix: string,
  postId: string,
  kind: PostImageKind,
  fileName: string,
  contentType: string,
): string {
  const sub = kind === "inline" ? "inline/" : "";
  return `${prefix}posts/${postId}/${sub}${photoBaseName(fileName)}.${photoExt(contentType)}`;
}

/** True if `pathname` is an image directly in the post's folder or its inline/ folder. */
export function isPostImagePathname(prefix: string, postId: string, pathname: string): boolean {
  const folder = postFolder(prefix, postId);
  if (!folder || !pathname.startsWith(folder)) return false;
  const rest = pathname.slice(folder.length);
  return FILE_RE.test(rest.startsWith("inline/") ? rest.slice("inline/".length) : rest);
}

/** The post id from `[e2e/]posts/<id>/[inline/]<file>`, or null. */
export function postIdFromPathname(prefix: string, pathname: string): string | null {
  if (!pathname.startsWith(`${prefix}posts/`)) return null;
  const id = pathname.slice(`${prefix}posts/`.length).split("/")[0] ?? "";
  return isPostImagePathname(prefix, id, pathname) ? id : null;
}

/** True if the Blob URL is a file in this post's folder (checked before saving a cover). */
export function isPostImageUrl(prefix: string, postId: string, url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".public.blob.vercel-storage.com"))
      return false;
    return isPostImagePathname(prefix, postId, decodeURIComponent(u.pathname.slice(1)));
  } catch {
    return false;
  }
}
