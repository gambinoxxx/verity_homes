// Vercel Blob checks and clean-up for e2e (Unit 15). Test uploads live under e2e/
// (BLOB_PATH_PREFIX, set in playwright.config.ts); nothing outside that prefix is touched.
import { del, head, list } from "@vercel/blob";

function token(): string {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new Error("BLOB_READ_WRITE_TOKEN is not set — photo e2e needs it in .env.test.");
  return t;
}

/** True if the file still exists in the store. */
export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url, { token: token() });
    return true;
  } catch {
    return false;
  }
}

/** Deletes every file under e2e/properties/<propertyId>/. */
export async function deleteE2ePhotos(propertyId: string): Promise<number> {
  const prefix = `e2e/properties/${propertyId}/`;
  let removed = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, token: token() });
    if (page.blobs.length) {
      await del(
        page.blobs.map((b) => b.url),
        { token: token() },
      );
      removed += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}
