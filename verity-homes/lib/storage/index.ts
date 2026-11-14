// Vercel Blob access (server). The only importers of @vercel/blob are this folder's files
// (eslint no-restricted-imports). Unit 14: remove(). Unit 15: client-upload token route.
// Unit 18: the token route also takes blog post images (posts/<id>/…), and listFolder() finds a
// post's files for the clean-up on save and delete.
import "server-only";
import { del, list } from "@vercel/blob";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { blobEnv } from "@/lib/env";
import { postIdFromPathname } from "@/lib/post-images";
import {
  MAX_PHOTO_BYTES,
  PHOTO_CONTENT_TYPES,
  propertyIdFromPathname,
} from "@/lib/property-photos";

/** Seed images ship in public/samples/ and are never deleted. */
export function isSampleImage(url: string): boolean {
  return url.startsWith("/samples/");
}

/** True for a file in Vercel Blob storage (https://<store>.public.blob.vercel-storage.com/…). */
export function isBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Folder prefix for every upload: "" normally, "e2e/" when Playwright sets BLOB_PATH_PREFIX,
 * so test files are easy to find and delete. Only lowercase letters, digits and hyphens.
 */
export function blobPathPrefix(): string {
  const p = process.env.BLOB_PATH_PREFIX ?? "";
  return /^[a-z0-9-]+\/$/.test(p) ? p : "";
}

/**
 * Deletes Blob-hosted files; anything else (e.g. /samples/ seed images) is skipped. Reads the
 * Blob token only when there is something to delete.
 */
export async function remove(urls: readonly string[]): Promise<{ removed: number }> {
  const blobs = urls.filter((u) => !isSampleImage(u) && isBlobUrl(u));
  if (!blobs.length) return { removed: 0 };
  const { BLOB_READ_WRITE_TOKEN } = blobEnv();
  await del(blobs, { token: BLOB_READ_WRITE_TOKEN });
  return { removed: blobs.length };
}

/**
 * Every file under `folder` (e.g. "posts/<id>/"), as URLs. Used to find a post's uploads; an
 * empty or malformed folder never lists the whole store.
 */
export async function listFolder(folder: string): Promise<string[]> {
  if (!/^([a-z0-9-]+\/)+$/.test(folder)) return [];
  const { BLOB_READ_WRITE_TOKEN } = blobEnv();
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: folder, cursor, token: BLOB_READ_WRITE_TOKEN });
    urls.push(...page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return urls;
}

/** Where an upload is going: a property's photos (Unit 15) or a blog post's images (Unit 18). */
export type UploadTarget = { kind: "property"; id: string } | { kind: "post"; id: string };

export function uploadTargetFromPathname(prefix: string, pathname: string): UploadTarget | null {
  const propertyId = propertyIdFromPathname(prefix, pathname);
  if (propertyId) return { kind: "property", id: propertyId };
  const postId = postIdFromPathname(prefix, pathname);
  if (postId) return { kind: "post", id: postId };
  return null;
}

export type UploadGate = (target: UploadTarget) => Promise<void>;

/**
 * Client-upload token endpoint (app/api/blob/upload/route.ts). `authorize` runs inside
 * onBeforeGenerateToken (requireAdmin + the property/post exists + limits) and throws to refuse.
 * Uploads: JPEG/PNG/WebP, ≤ 10 MB, random suffix, only into `<prefix>properties/<id>/` or
 * `<prefix>posts/<id>/[inline/]`.
 * No onUploadCompleted: the browser saves the result itself through a server action or the
 * editor's save, because Blob's completion webhook can't reach localhost.
 */
export async function handleImageUpload(
  request: Request,
  body: HandleUploadBody,
  authorize: UploadGate,
) {
  const { BLOB_READ_WRITE_TOKEN } = blobEnv();
  const prefix = blobPathPrefix();
  return handleUpload({
    token: BLOB_READ_WRITE_TOKEN,
    request,
    body,
    onBeforeGenerateToken: async (pathname) => {
      const target = uploadTargetFromPathname(prefix, pathname);
      if (!target) throw new UploadRefused("Images must go into a property's or a post's folder.");
      await authorize(target);
      return {
        allowedContentTypes: [...PHOTO_CONTENT_TYPES],
        maximumSizeInBytes: MAX_PHOTO_BYTES,
        addRandomSuffix: true,
      };
    },
  });
}

/** Thrown by the upload gate; the route turns it into a 4xx with this message. */
export class UploadRefused extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "UploadRefused";
  }
}
