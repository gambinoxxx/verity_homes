// Vercel Blob access. The only importer of @vercel/blob (eslint no-restricted-imports).
// Unit 14: remove() for deleted properties. Unit 15 adds uploads.
import "server-only";
import { del } from "@vercel/blob";
import { blobEnv } from "@/lib/env";

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
