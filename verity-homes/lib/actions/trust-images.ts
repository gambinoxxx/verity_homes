// Blob clean-up shared by the testimonial and partner actions (Unit 19b). Not a "use server"
// module: plain server helpers, called only after requireAdmin(). remove() never touches
// /samples/ or anything outside Blob.
import "server-only";
import { type TrustKind, trustFolder } from "@/lib/trust-images";
import { blobPathPrefix, isBlobUrl, listFolder, remove } from "@/lib/storage";

/**
 * After a save: delete the record's uploads other than its current image (old/replaced ones).
 * Skipped when neither the previous nor the new image is a Blob file.
 */
export async function sweepTrustFolder(
  kind: TrustKind,
  id: string,
  keep: string | null,
  previous: string | null,
) {
  const folder = trustFolder(blobPathPrefix(), kind, id);
  if (!folder || ![keep, previous].some((u) => u && isBlobUrl(u))) return;
  try {
    const unused = (await listFolder(folder)).filter((url) => url !== keep);
    if (unused.length) await remove(unused);
  } catch (e) {
    console.error(`${kind} image clean-up failed:`, e instanceof Error ? e.name : "unknown");
  }
}

/** After a delete: the record's image and everything in its folder. */
export async function removeTrustFiles(kind: TrustKind, id: string, image: string | null) {
  try {
    const folder = trustFolder(blobPathPrefix(), kind, id);
    const files = folder ? await listFolder(folder) : [];
    const all = [...new Set([...(image ? [image] : []), ...files])];
    if (all.length) await remove(all);
  } catch (e) {
    console.error(
      `${kind} delete: image clean-up failed:`,
      e instanceof Error ? e.name : "unknown",
    );
  }
}
