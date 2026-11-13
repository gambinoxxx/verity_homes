// Vercel Blob access (server). The only importers of @vercel/blob are this folder's files
// (eslint no-restricted-imports). Unit 14: remove(). Unit 15: client-upload token route.
import "server-only";
import { del } from "@vercel/blob";
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { blobEnv } from "@/lib/env";
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

export type UploadGate = (propertyId: string) => Promise<void>;

/**
 * Client-upload token endpoint (app/api/blob/upload/route.ts). `authorize` runs inside
 * onBeforeGenerateToken (requireAdmin + the property exists + photo limit) and throws to refuse.
 * Uploads: JPEG/PNG/WebP, ≤ 10 MB, random suffix, only into `<prefix>properties/<id>/`.
 * No onUploadCompleted: the browser saves the row itself through a server action, because
 * Blob's completion webhook can't reach localhost.
 */
export async function handlePhotoUpload(
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
      const propertyId = propertyIdFromPathname(prefix, pathname);
      if (!propertyId) throw new UploadRefused("Photos must go into a property's folder.");
      await authorize(propertyId);
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
