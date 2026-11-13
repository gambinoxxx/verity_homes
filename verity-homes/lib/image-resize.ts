// Browser-only: shrink a photo before upload (Unit 15) — Lagos mobile data matters.
// Decodes the file, scales it to ≤ 2400 px on the long side (EXIF orientation applied) and
// re-encodes as WebP, or JPEG where the browser can't encode WebP (Safari), at ~0.82 quality.
import { MAX_PHOTO_SIDE, PHOTO_QUALITY, fitWithin } from "@/lib/property-photos";

export const UNSUPPORTED_PHOTO =
  "This photo format isn't supported — please upload JPG, PNG or WebP.";

export class UnsupportedPhotoError extends Error {
  constructor() {
    super(UNSUPPORTED_PHOTO);
    this.name = "UnsupportedPhotoError";
  }
}

export type ResizedPhoto = { blob: Blob; width: number; height: number; contentType: string };

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function resizeForUpload(
  file: File,
  maxSide = MAX_PHOTO_SIDE,
  quality = PHOTO_QUALITY,
): Promise<ResizedPhoto> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new UnsupportedPhotoError(); // e.g. HEIC outside Safari, or not an image at all
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new UnsupportedPhotoError();
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    // WebP first; browsers that can't encode it hand back PNG, so fall back to JPEG.
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob) throw new UnsupportedPhotoError();
    return { blob, width, height, contentType: blob.type };
  } finally {
    bitmap.close();
  }
}
